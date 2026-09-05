const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isMemoryLimitError,
  runWithInput,
  killProcessTree,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MEMORY_LIMIT_MB,
  MAX_OUTPUT_SIZE_BYTES
} = require('../src/services/judge.service');

describe('Judge Service Safeguards', () => {
  it('exports configuration constants and helper functions', () => {
    assert.strictEqual(typeof DEFAULT_TIMEOUT_MS, 'number');
    assert.strictEqual(typeof DEFAULT_MEMORY_LIMIT_MB, 'number');
    assert.strictEqual(typeof MAX_OUTPUT_SIZE_BYTES, 'number');
    assert.strictEqual(typeof isMemoryLimitError, 'function');
    assert.strictEqual(typeof killProcessTree, 'function');
    assert.strictEqual(typeof runWithInput, 'function');
  });

  it('correctly identifies memory limit errors from stderr and exit conditions', () => {
    assert.strictEqual(isMemoryLimitError(1, null, 'Traceback ... MemoryError: out of memory'), true);
    assert.strictEqual(isMemoryLimitError(134, 'SIGABRT', 'terminate called after throwing an instance of std::bad_alloc'), true);
    assert.strictEqual(isMemoryLimitError(1, null, 'fatal error: out of memory'), true);
    assert.strictEqual(isMemoryLimitError(1, null, 'libc: Cannot allocate memory'), true);
    assert.strictEqual(isMemoryLimitError(1, null, 'virtual memory exhausted: Cannot allocate memory'), true);

    // Should NOT identify normal errors as memory errors
    assert.strictEqual(isMemoryLimitError(1, null, 'ZeroDivisionError: division by zero'), false);
    assert.strictEqual(isMemoryLimitError(1, null, 'SyntaxError: invalid syntax'), false);
    assert.strictEqual(isMemoryLimitError(0, null, ''), false);
  });

  it('enforces output size cap when process generates excessive stdout', async () => {
    // Generate script that prints > 1MB of text
    const script = 'console.log("A".repeat(1024 * 1024 + 100));';
    await assert.rejects(
      runWithInput('node', ['-e', script], '', 5000, 256),
      /Output Limit Exceeded/
    );
  });

  it('enforces timeout and kills process on execution exceed', async () => {
    // Run an infinite loop script with a short timeout
    const script = 'while(true) {}';
    await assert.rejects(
      runWithInput('node', ['-e', script], '', 300, 256),
      /Time Limit Exceeded/
    );
  });

  it('successfully executes compliant code within limits', async () => {
    const script = 'process.stdin.on("data", d => process.stdout.write(d.toString().trim() + " OK"));';
    const output = await runWithInput('node', ['-e', script], 'HELLO', 5000, 256);
    assert.strictEqual(output.trim(), 'HELLO OK');
  });
});
