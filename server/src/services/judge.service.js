const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const Submission = require('../models/submission');
const Problem = require('../models/problem');

const DEFAULT_TIMEOUT_MS = 5000; // 5 seconds per test case
const DEFAULT_MEMORY_LIMIT_MB = 256; // 256 MB per submission
const MAX_OUTPUT_SIZE_BYTES = 1024 * 1024; // 1 MB max stdout cap
const MAX_STDERR_SIZE_BYTES = 64 * 1024; // 64 KB max stderr buffer

/**
 * Kill entire process tree (cross-platform).
 * Prevents orphaned child processes/fork bombs from surviving.
 */
function killProcessTree(child) {
  if (!child || !child.pid) return;

  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch (e) {
      try {
        child.kill('SIGKILL');
      } catch (err) {
        // Ignore if already dead
      }
    }
  } else {
    try {
      // Negative PID kills the entire process group
      process.kill(-child.pid, 'SIGKILL');
    } catch (e) {
      try {
        child.kill('SIGKILL');
      } catch (err) {
        // Ignore if already dead
      }
    }
  }
}

/**
 * Check if the error or exit condition corresponds to Memory Limit Exceeded.
 */
function isMemoryLimitError(code, signal, stderr) {
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

async function writeTempFile(code, language) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oj-'));
  let filename, compileCmd, runCmd, runArgs;

  if (language === 'python') {
    filename = path.join(tmpDir, 'solution.py');
    runCmd = 'python3';
    runArgs = [filename];
  } else if (language === 'c') {
    filename = path.join(tmpDir, 'solution.c');
    compileCmd = { cmd: 'gcc', args: [filename, '-o', path.join(tmpDir, 'solution'), '-std=c11'] };
    runCmd = path.join(tmpDir, 'solution');
    runArgs = [];
  } else if (language === 'cpp') {
    filename = path.join(tmpDir, 'solution.cpp');
    compileCmd = { cmd: 'g++', args: [filename, '-o', path.join(tmpDir, 'solution'), '-std=c++17'] };
    runCmd = path.join(tmpDir, 'solution');
    runArgs = [];
  } else {
    throw new Error('Unsupported language');
  }

  await fs.writeFile(filename, code);
  return { tmpDir, compileCmd, runCmd, runArgs };
}

function runWithInput(cmd, args, input, timeoutMs = DEFAULT_TIMEOUT_MS, memoryLimitMb = DEFAULT_MEMORY_LIMIT_MB) {
  return new Promise((resolve, reject) => {
    let spawnCmd = cmd;
    let spawnArgs = args;

    // Enforce memory limit via ulimit -v on Linux / POSIX systems
    if (process.platform !== 'win32' && memoryLimitMb) {
      const memoryLimitKb = memoryLimitMb * 1024;
      spawnCmd = 'sh';
      spawnArgs = ['-c', `ulimit -v ${memoryLimitKb} && exec "$@"`, '_', cmd, ...args];
    }

    let child;
    try {
      child = spawn(spawnCmd, spawnArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: process.platform !== 'win32' // Creates new process group on POSIX
      });
    } catch (err) {
      return reject(err);
    }

    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let isTerminated = false;

    // 1. Enforce wall-clock timeout
    const timer = setTimeout(() => {
      if (isTerminated) return;
      isTerminated = true;
      killProcessTree(child);
      reject(new Error('Time Limit Exceeded'));
    }, timeoutMs);

    // Prevent uncaught EPIPE errors if child exits early
    child.stdin.on('error', () => {});

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();

    // 2. Enforce max output size cap
    child.stdout.on('data', (data) => {
      stdoutBytes += data.length;
      if (stdoutBytes > MAX_OUTPUT_SIZE_BYTES) {
        if (!isTerminated) {
          isTerminated = true;
          clearTimeout(timer);
          killProcessTree(child);
          reject(new Error('Output Limit Exceeded'));
        }
        return;
      }
      stdout += data.toString();
    });

    // 3. Cap stderr buffer to prevent memory bloat from excessive error logs
    child.stderr.on('data', (data) => {
      stderrBytes += data.length;
      if (stderrBytes <= MAX_STDERR_SIZE_BYTES) {
        stderr += data.toString();
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!isTerminated) {
        isTerminated = true;
        reject(err);
      }
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (isTerminated) return;

      // 4. Distinguish Memory Limit Exceeded
      if (isMemoryLimitError(code, signal, stderr)) {
        return reject(new Error('Memory Limit Exceeded'));
      }

      if (code !== 0 || signal) {
        const errorDetail = stderr.trim() || `Runtime Error (exit code ${code || signal})`;
        return reject(new Error(errorDetail));
      }

      resolve(stdout);
    });
  });
}

async function cleanup(tmpDir) {
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch (e) {
    // ignore cleanup errors
  }
}

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

    // Compile if needed (C/C++)
    if (fileInfo.compileCmd) {
      try {
        await runWithInput(fileInfo.compileCmd.cmd, fileInfo.compileCmd.args, '', DEFAULT_TIMEOUT_MS, memoryLimit);
      } catch (compileErr) {
        submission.status = 'incorrect';
        submission.error = compileErr.message.startsWith('Compilation Error')
          ? compileErr.message
          : `Compilation Error: ${compileErr.message}`;
        submission.results = [];
        await submission.save();
        await cleanup(tmpDir);
        return 'incorrect';
      }
    }

    // Run each test case
    const results = [];
    for (const tc of testCases) {
      const startTime = Date.now();
      let actualOutput = '';
      let passed = false;
      let errorMsg = null;

      try {
        actualOutput = await runWithInput(fileInfo.runCmd, fileInfo.runArgs, tc.input, timeLimit, memoryLimit);
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
  runWithInput,
  killProcessTree,
  isMemoryLimitError,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MEMORY_LIMIT_MB,
  MAX_OUTPUT_SIZE_BYTES
};