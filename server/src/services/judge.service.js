const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { PassThrough } = require('stream');
const Docker = require('dockerode');
const Submission = require('../models/submission');
const Problem = require('../models/problem');

/**
 * WHY DOCKERODE:
 * We use the `dockerode` package instead of shelling out to `docker run` via child_process because:
 * 1. Security & Injection Safety: Interacting directly with the Docker Engine REST API via Unix socket / Windows
 *    named pipe bypasses the host shell completely, eliminating command injection and shell-escaping vulnerabilities.
 * 2. Performance & Reliability: Avoids process-spawning overhead of the Docker CLI per test case and provides native
 *    multiplexed duplex streams (stdin/stdout/stderr) directly in Node.js event loop.
 * 3. Granular Lifecycle Control: Direct handle on container creation, stream attachment, force-kill signals,
 *    inspection, and cleanup with standard JavaScript async/await promises.
 */
const docker = new Docker();

const JUDGE_IMAGE = process.env.JUDGE_IMAGE || 'judge-runner';
const DEFAULT_TIMEOUT_MS = 5000; // 5 seconds per test case
const DEFAULT_MEMORY_LIMIT_MB = 256; // 256 MB per submission
const MAX_OUTPUT_SIZE_BYTES = 1024 * 1024; // 1 MB max stdout cap
const MAX_STDERR_SIZE_BYTES = 64 * 1024; // 64 KB max stderr buffer

/**
 * Check if the error or exit condition corresponds to Memory Limit Exceeded.
 */
function isMemoryLimitError(code, signal, stderr, oomKilled = false) {
  if (oomKilled || code === 137) {
    return true;
  }

  const errLower = (stderr || '').toLowerCase();
  if (
    errLower.includes('memoryerror') ||
    errLower.includes('std::bad_alloc') ||
    errLower.includes('bad_alloc') ||
    errLower.includes('out of memory') ||
    errLower.includes('cannot allocate memory') ||
    errLower.includes('virtual memory exhausted')
  ) {
    return true;
  }

  // Signal / code checks for memory-related crashes when stderr might be truncated
  if (signal === 'SIGSEGV' || signal === 'SIGABRT' || code === 134 || code === 139) {
    if (errLower.includes('alloc') || errLower.includes('memory')) {
      return true;
    }
  }

  return false;
}

/**
 * Write submission source code to a host temporary directory.
 */
async function writeTempFile(code, language) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oj-'));
  let filename, compileCmd, runCmd;

  if (language === 'python') {
    filename = path.join(tmpDir, 'solution.py');
    runCmd = ['python3', '-u', '/sandbox/src/solution.py'];
  } else if (language === 'c') {
    filename = path.join(tmpDir, 'solution.c');
    compileCmd = ['gcc', '/sandbox/src/solution.c', '-o', '/sandbox/bin/solution', '-std=c11', '-O2'];
    runCmd = ['/sandbox/bin/solution'];
  } else if (language === 'cpp') {
    filename = path.join(tmpDir, 'solution.cpp');
    compileCmd = ['g++', '/sandbox/src/solution.cpp', '-o', '/sandbox/bin/solution', '-std=c++17', '-O2'];
    runCmd = ['/sandbox/bin/solution'];
  } else {
    throw new Error('Unsupported language');
  }

  await fs.writeFile(filename, code);
  return { tmpDir, compileCmd, runCmd };
}

/**
 * Execute a command inside an isolated ephemeral Docker sandbox container.
 */
async function runInDockerSandbox({
  cmd,
  input = '',
  tmpDir,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  memoryLimitMb = DEFAULT_MEMORY_LIMIT_MB
}) {
  let container = null;
  let timer = null;

  try {
    const memoryBytes = memoryLimitMb * 1024 * 1024;

    // Convert Windows path separators for Docker volume bind if necessary
    const hostBindPath = path.resolve(tmpDir).replace(/\\/g, '/');

    // Create ephemeral sandbox container with strict isolation bounds
    container = await docker.createContainer({
      Image: JUDGE_IMAGE,
      Cmd: cmd,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: true,
      StdinOnce: true,
      Tty: false,
      User: 'sandboxuser', // Run as non-root user (UID 1001)
      WorkingDir: '/sandbox',
      HostConfig: {
        AutoRemove: false, // Explicitly removed in finally block after capturing status
        NetworkMode: 'none', // Complete network isolation (prevents exfiltration/callbacks)
        Memory: memoryBytes, // RAM hard cap
        MemorySwap: memoryBytes, // Disable swap fallback (MemorySwap == Memory)
        NanoCpus: 500000000, // 0.5 CPU cores
        PidsLimit: 64, // Fork bomb mitigation
        ReadonlyRootfs: true, // Read-only root filesystem
        Tmpfs: {
          '/sandbox': 'size=10m,mode=1777' // Isolated writable 10MB tmpfs for compilation/temporary runtime files
        },
        Binds: [
          `${hostBindPath}:/sandbox/src:ro` // Source code mounted read-only
        ]
      }
    });

    const containerId = container.id.substring(0, 12);
    const startTime = Date.now();

    // Attach stream to communicate with container stdin, stdout, stderr
    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      hijack: true
    });

    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();

    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let isTerminated = false;
    let terminationError = null;

    // Demultiplex Docker stream into separate stdout and stderr
    container.modem.demuxStream(stream, stdoutStream, stderrStream);

    stdoutStream.on('data', (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_OUTPUT_SIZE_BYTES) {
        if (!isTerminated) {
          isTerminated = true;
          terminationError = new Error('Output Limit Exceeded');
          container.kill().catch(() => {});
        }
        return;
      }
      stdout += chunk.toString('utf8');
    });

    stderrStream.on('data', (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= MAX_STDERR_SIZE_BYTES) {
        stderr += chunk.toString('utf8');
      }
    });

    // Start container execution
    await container.start();

    // Send input via stdin and close stream
    if (input) {
      stream.write(input);
    }
    stream.end();

    // Container-level hard timeout enforcement
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(async () => {
        if (!isTerminated) {
          isTerminated = true;
          terminationError = new Error('Time Limit Exceeded');
          try {
            await container.kill();
          } catch (kErr) {
            // Container may have just finished
          }
          reject(terminationError);
        }
      }, timeoutMs);
    });

    // Wait for container completion
    const waitPromise = container.wait();

    // Race container execution against timeout
    const waitResult = await Promise.race([waitPromise, timeoutPromise]);
    clearTimeout(timer);

    if (terminationError) {
      throw terminationError;
    }

    const exitCode = waitResult.StatusCode;
    const duration = Date.now() - startTime;

    // Server-side audit logging (container ID and exit code not leaked to client)
    console.log(`[Sandbox] Container ${containerId} executed in ${duration}ms with exit code ${exitCode}`);

    // Check for container-level OOM or memory limit breach
    const isOOM = isMemoryLimitError(exitCode, null, stderr, waitResult?.Error?.toLowerCase()?.includes('oom') || false);
    if (isOOM) {
      throw new Error('Memory Limit Exceeded');
    }

    if (exitCode !== 0) {
      const errorDetail = stderr.trim() || `Runtime Error (exit code ${exitCode})`;
      throw new Error(errorDetail);
    }

    return stdout;

  } catch (err) {
    if (timer) clearTimeout(timer);

    // Differentiate infrastructure/Docker daemon failures from user submission errors
    if (
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('ENOENT') ||
      err.message.includes('npipe') ||
      err.message.includes('connect') ||
      err.message.includes('no such image') ||
      err.statusCode === 500 ||
      err.json?.message?.includes('No such image')
    ) {
      console.error('[Sandbox Error] Docker infrastructure failure:', err.message);
      throw new Error(`Sandbox Error: ${err.message}`);
    }

    throw err;
  } finally {
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (removeErr) {
        // Ignore removal error if container already removed
      }
    }
  }
}

/**
 * Remove temporary directory from host.
 */
async function cleanup(tmpDir) {
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch (e) {
    // ignore cleanup errors
  }
}

/**
 * Judge a code submission using the Docker sandbox runner.
 */
async function judgeSubmission(submissionId) {
  const submission = await Submission.findById(submissionId).populate('problem');

  if (!submission) throw new Error('Submission not found');
  if (submission.status !== 'pending') return submission.status;

  const testCases = submission.problem.testCases;

  // Reject if no test cases exist
  if (!testCases || testCases.length === 0) {
    submission.status = 'incorrect';
    submission.error = 'No test cases available for this problem';
    await submission.save();
    return 'incorrect';
  }

  let tmpDir;
  try {
    const fileInfo = await writeTempFile(submission.sourceCode, submission.language);
    tmpDir = fileInfo.tmpDir;

    const timeLimit = submission.problem.timeLimit || DEFAULT_TIMEOUT_MS;
    const memoryLimit = submission.problem.memoryLimit || DEFAULT_MEMORY_LIMIT_MB;

    // Compile step inside Docker sandbox if needed (C/C++)
    if (fileInfo.compileCmd) {
      try {
        await runInDockerSandbox({
          cmd: fileInfo.compileCmd,
          input: '',
          tmpDir,
          timeoutMs: DEFAULT_TIMEOUT_MS,
          memoryLimitMb: memoryLimit
        });
      } catch (compileErr) {
        submission.status = 'incorrect';
        if (compileErr.message.startsWith('Sandbox Error')) {
          submission.error = compileErr.message;
        } else {
          submission.error = compileErr.message.startsWith('Compilation Error')
            ? compileErr.message
            : `Compilation Error:\n${compileErr.message}`;
        }
        submission.results = [];
        await submission.save();
        await cleanup(tmpDir);
        return 'incorrect';
      }
    }

    // Run each test case in its own isolated ephemeral Docker container
    const results = [];
    for (const tc of testCases) {
      const startTime = Date.now();
      let actualOutput = '';
      let passed = false;
      let errorMsg = null;

      try {
        actualOutput = await runInDockerSandbox({
          cmd: fileInfo.runCmd,
          input: tc.input,
          tmpDir,
          timeoutMs: timeLimit,
          memoryLimitMb: memoryLimit
        });

        // Normalize line endings and trim trailing whitespace
        const normalizedActual = actualOutput.replace(/\r\n/g, '\n').trimEnd();
        const normalizedExpected = tc.output.replace(/\r\n/g, '\n').trimEnd();
        passed = normalizedActual === normalizedExpected;
      } catch (err) {
        errorMsg = err.message;
      }

      results.push({
        input: tc.input,
        expectedOutput: tc.output,
        actualOutput,
        passed,
        error: errorMsg,
        executionTime: Date.now() - startTime
      });

      if (!passed) {
        submission.status = 'incorrect';
        submission.output = actualOutput;
        submission.error = errorMsg || 'Wrong Answer';
        submission.results = results;
        await submission.save();
        await cleanup(tmpDir);
        return 'incorrect';
      }
    }

    submission.status = 'correct';
    submission.results = results;
    await submission.save();
    await cleanup(tmpDir);
    return 'correct';

  } catch (err) {
    if (tmpDir) await cleanup(tmpDir);
    submission.status = 'incorrect';
    submission.error = err.message;
    await submission.save();
    return 'incorrect';
  }
}

module.exports = {
  judgeSubmission,
  runInDockerSandbox,
  isMemoryLimitError,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MEMORY_LIMIT_MB,
  MAX_OUTPUT_SIZE_BYTES,
  JUDGE_IMAGE
};