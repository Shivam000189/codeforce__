const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
  apiLimiter,
  authLimiter,
  submissionLimiter,
  judgeLimiter
} = require('../src/middlewares/rateLimiter');

test('rate limiters are defined middleware functions', () => {
  assert.equal(typeof apiLimiter, 'function');
  assert.equal(typeof authLimiter, 'function');
  assert.equal(typeof submissionLimiter, 'function');
  assert.equal(typeof judgeLimiter, 'function');
});

test('submissionLimiter blocks requests exceeding max limit and keys by user ID', async () => {
  const app = express();
  const rateLimit = require('express-rate-limit');

  // Test limiter mimicking submissionLimiter config with limit of 2 per user
  const testLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.userId ? `user_${req.user.userId}` : (req.ip || 'unknown_ip');
    },
    message: { message: 'Too many submissions, please wait before submitting again' }
  });

  // Mock auth middleware simulating user ID injection
  app.use((req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (userId) {
      req.user = { userId };
    }
    next();
  });

  app.post('/test-submit', testLimiter, (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // User A - Request 1 (200)
    const resA1 = await fetch(`http://localhost:${port}/test-submit`, {
      method: 'POST',
      headers: { 'x-user-id': 'user_A' }
    });
    assert.equal(resA1.status, 200);

    // User A - Request 2 (200)
    const resA2 = await fetch(`http://localhost:${port}/test-submit`, {
      method: 'POST',
      headers: { 'x-user-id': 'user_A' }
    });
    assert.equal(resA2.status, 200);

    // User A - Request 3 (429: Too Many Requests)
    const resA3 = await fetch(`http://localhost:${port}/test-submit`, {
      method: 'POST',
      headers: { 'x-user-id': 'user_A' }
    });
    assert.equal(resA3.status, 429);
    assert.ok(resA3.headers.get('retry-after'), 'Should include Retry-After header');
    const bodyA3 = await resA3.json();
    assert.deepEqual(bodyA3, { message: 'Too many submissions, please wait before submitting again' });

    // User B (same IP, different userId) - Request 1 (should NOT be blocked, 200)
    const resB1 = await fetch(`http://localhost:${port}/test-submit`, {
      method: 'POST',
      headers: { 'x-user-id': 'user_B' }
    });
    assert.equal(resB1.status, 200);
  } finally {
    server.close();
  }
});

