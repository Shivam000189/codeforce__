const rateLimit = require('express-rate-limit');

/**
 * General rate limiter for all API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' }
});

/**
 * Stricter rate limiter for authentication routes (login / register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' }
});

/**
 * Rate limiter for code submissions to prevent DoS from heavy compilation/execution
 */
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 submissions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions, please try again later' }
});

/**
 * Rate limiter for manual judge re-run triggers
 */
const judgeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 judge requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many judge requests, please try again later' }
});

module.exports = {
  apiLimiter,
  authLimiter,
  submissionLimiter,
  judgeLimiter
};
