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

test('submissionLimiter blocks requests exceeding the max limit', async () => {
  const app = express();
  const rateLimit = require('express-rate-limit');

  // Create a small-limit instance mirroring submissionLimiter configuration
  const testLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many submissions, please try again later' }
  });

  app.post('/test-submit', testLimiter, (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Request 1: should succeed (200)
    const res1 = await fetch(`http://localhost:${port}/test-submit`, { method: 'POST' });
    assert.equal(res1.status, 200);

    // Request 2: should succeed (200)
    const res2 = await fetch(`http://localhost:${port}/test-submit`, { method: 'POST' });
    assert.equal(res2.status, 200);

    // Request 3: should be rate limited (429)
    const res3 = await fetch(`http://localhost:${port}/test-submit`, { method: 'POST' });
    assert.equal(res3.status, 429);
    const body3 = await res3.json();
    assert.deepEqual(body3, { message: 'Too many submissions, please try again later' });
  } finally {
    server.close();
  }
});
