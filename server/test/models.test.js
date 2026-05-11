const test = require('node:test');
const assert = require('node:assert/strict');

const Submission = require('../src/models/submission');
const Problem = require('../src/models/problem');

test('submission language enum rejects unsupported language', () => {
  const invalidSubmission = new Submission({
    user: '64f1a2b3c4d5e6f7a8b9c0d1',
    problem: '64f1a2b3c4d5e6f7a8b9c0d2',
    sourceCode: 'print("hello")',
    language: 'java'
  });

  const error = invalidSubmission.validateSync();

  assert.ok(error);
  assert.ok(error.errors.language);
});

test('problem difficulty enum accepts valid values', () => {
  const problem = new Problem({
    title: 'Two Sum',
    statement: 'Find two numbers',
    difficulty: 'easy',
    createdBy: '64f1a2b3c4d5e6f7a8b9c0d3'
  });

  const error = problem.validateSync();

  assert.equal(error, undefined);
});
