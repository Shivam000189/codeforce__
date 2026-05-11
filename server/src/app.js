const express = require('express');
const app = express();
const authRoutes = require('./routes/auth.routes');
const proRoutes = require('./routes/problem.routes');
const subRoutes = require('./routes/submission.routes');
const judgeRoute = require('./routes/judge.routes');

app.use(express.json());


const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many login attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/submission', subRoutes);
app.use('/api/problem', proRoutes);
app.use('/api/judge', judgeRoute);

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'Codeforces OJ API',
    status: 'running',
    version: '1.0.0'
  });
});

// ─── 404 Handler ───
app.use((req, res, next) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ─── Global Error Handler ───
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak stack traces in production
  const isDev = process.env.NODE_ENV === 'development';

  res.status(err.status || err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack })
  });
});

module.exports = app;