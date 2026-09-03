const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const Submission = require('../models/submission');
const Problem = require('../models/problem');

const TIMEOUT_MS = 5000; // 5 seconds per test case

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

function runWithInput(cmd, args, input, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
      reject(new Error('Time Limit Exceeded'));
    }, timeoutMs);

    child.stdin.write(input);
    child.stdin.end();

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code !== 0) {
        reject(new Error(stderr || `Runtime error (exit code ${code})`));
      } else {
        resolve(stdout);
      }
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

  // Fix: reject if no test cases exist
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

    // Compile if needed (C/C++)
    if (fileInfo.compileCmd) {
      await runWithInput(fileInfo.compileCmd.cmd, fileInfo.compileCmd.args, '', TIMEOUT_MS);
    }

    const testCaseTimeout = submission.problem.timeLimit || TIMEOUT_MS;

    // Run each test case
    const results = [];
    for (const tc of testCases) {
      const startTime = Date.now();
      let actualOutput = '';
      let passed = false;
      let errorMsg = null;

      try {
        actualOutput = await runWithInput(fileInfo.runCmd, fileInfo.runArgs, tc.input, testCaseTimeout);
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

module.exports = { judgeSubmission };