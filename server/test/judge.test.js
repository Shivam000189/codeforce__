const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isMemoryLimitError,
  runInDockerSandbox,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MEMORY_LIMIT_MB,
  MAX_OUTPUT_SIZE_BYTES,
  JUDGE_IMAGE
} = require('../src/services/judge.service');

describe('Judge Service Docker Sandbox & Safeguards', () => {
  it('exports configuration constants and helper functions', () => {
    assert.strictEqual(typeof DEFAULT_TIMEOUT_MS, 'number');
    assert.strictEqual(typeof DEFAULT_MEMORY_LIMIT_MB, 'number');
    assert.strictEqual(typeof MAX_OUTPUT_SIZE_BYTES, 'number');
    assert.strictEqual(typeof JUDGE_IMAGE, 'string');
    assert.strictEqual(typeof isMemoryLimitError, 'function');
    assert.strictEqual(typeof runInDockerSandbox, 'function');
  });

  it('correctly identifies memory limit errors from exit codes, signals, and stderr', () => {
    // Python MemoryError
    assert.strictEqual(isMemoryLimitError(1, null, 'Traceback ... MemoryError: out of memory'), true);
    // C++ std::bad_alloc
    assert.strictEqual(isMemoryLimitError(134, 'SIGABRT', 'terminate called after throwing an instance of std::bad_alloc'), true);
    // Standard Linux OOM killer signals
    assert.strictEqual(isMemoryLimitError(137, 'SIGKILL', ''), true);
    assert.strictEqual(isMemoryLimitError(0, null, '', true), true); // oomKilled = true
    assert.strictEqual(isMemoryLimitError(1, null, 'fatal error: out of memory'), true);
    assert.strictEqual(isMemoryLimitError(1, null, 'libc: Cannot allocate memory'), true);
    assert.strictEqual(isMemoryLimitError(1, null, 'virtual memory exhausted: Cannot allocate memory'), true);

    // Should NOT identify normal errors as memory errors
    assert.strictEqual(isMemoryLimitError(1, null, 'ZeroDivisionError: division by zero'), false);
    assert.strictEqual(isMemoryLimitError(1, null, 'SyntaxError: invalid syntax'), false);
    assert.strictEqual(isMemoryLimitError(0, null, ''), false);
  });

  it('raises distinct Sandbox Error when Docker daemon is unavailable', async () => {
    // Invoking runner when daemon is offline should throw a Sandbox Error
    await assert.rejects(
      runInDockerSandbox({
        cmd: ['echo', 'test'],
        input: '',
        tmpDir: './',
        timeoutMs: 1000,
        memoryLimitMb: 256
      }),
      (err) => {
        assert.ok(err.message.includes('Sandbox Error') || err.message.includes('connect'), `Expected Sandbox Error, got: ${err.message}`);
        return true;
      }
    );
  });
});

