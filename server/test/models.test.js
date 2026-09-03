const test = require('node:test');
const assert = require('node:assert/strict');

const Submission = require('../src/models/submission');
const Problem = require('../src/models/problem');
const User = require('../src/models/User');

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
  assert.deepEqual(problem.tags, []);
  assert.equal(problem.timeLimit, 2000);
  assert.equal(problem.memoryLimit, 256);
  assert.equal(problem.constraints, '');
  assert.equal(problem.editorial, '');
});

test('problem model accepts custom tags, limits, constraints, editorial', () => {
  const problem = new Problem({
    title: 'Two Sum',
    statement: 'Find two numbers',
    difficulty: 'medium',
    tags: ['array', 'hash-table'],
    timeLimit: 1000,
    memoryLimit: 512,
    constraints: '1 <= N <= 10^5',
    editorial: 'Use a hash map to store complements in O(N) time.',
    createdBy: '64f1a2b3c4d5e6f7a8b9c0d3'
  });

  const error = problem.validateSync();

  assert.equal(error, undefined);
  assert.deepEqual(problem.tags, ['array', 'hash-table']);
  assert.equal(problem.timeLimit, 1000);
  assert.equal(problem.memoryLimit, 512);
  assert.equal(problem.constraints, '1 <= N <= 10^5');
  assert.equal(problem.editorial, 'Use a hash map to store complements in O(N) time.');
});

test('problem model validates timeLimit and memoryLimit bounds', () => {
  const invalidTimeProblem = new Problem({
    title: 'Slow Problem',
    statement: 'Takes forever',
    difficulty: 'hard',
    timeLimit: 50, // below 100ms
    createdBy: '64f1a2b3c4d5e6f7a8b9c0d3'
  });

  const error = invalidTimeProblem.validateSync();
  assert.ok(error);
  assert.ok(error.errors.timeLimit);
});

test('user model defaults role to "user"', () => {
  const user = new User({
    name: 'Alice',
    email: 'alice@example.com',
    password: 'password123'
  });

  const error = user.validateSync();
  assert.equal(error, undefined);
  assert.equal(user.role, 'user');
});

test('user model accepts valid roles ("moderator", "admin")', () => {
  const modUser = new User({
    name: 'Mod',
    email: 'mod@example.com',
    password: 'password123',
    role: 'moderator'
  });
  const adminUser = new User({
    name: 'Admin',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin'
  });

  assert.equal(modUser.validateSync(), undefined);
  assert.equal(modUser.role, 'moderator');
  assert.equal(adminUser.validateSync(), undefined);
  assert.equal(adminUser.role, 'admin');
});

test('user model rejects invalid role', () => {
  const invalidUser = new User({
    name: 'Hacker',
    email: 'hacker@example.com',
    password: 'password123',
    role: 'superadmin'
  });

  const error = invalidUser.validateSync();
  assert.ok(error);
  assert.ok(error.errors.role);
});

test('user pre-save hook hashes password asynchronously without calling next()', async () => {
  const user = new User({
    name: 'Hasher',
    email: 'hasher@example.com',
    password: 'plainPassword123'
  });

  // Execute pre-save middleware via Kareem or direct dispatch
  const bcrypt = require('bcryptjs');
  const isPlainBefore = await bcrypt.compare('plainPassword123', user.password).catch(() => false);
  assert.equal(isPlainBefore, false);

  // Trigger schema pre save
  await user.schema.s.hooks.execPre('save', user);

  const isHashed = await bcrypt.compare('plainPassword123', user.password);
  assert.equal(isHashed, true);
});


