const express = require('express');
const app = express();
const authRoutes = require('./routes/auth.routes');
const proRoutes = require('./routes/problem.routes');
const subRoutes = require('./routes/submission.routes');
const judgeRoute = require('./routes/judge.routes');
const userRoutes = require('./routes/user.routes');

app.use(express.json());


const helmet = require('helmet');
const cors = require('cors');
const { apiLimiter, authLimiter } = require('./middlewares/rateLimiter');

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/submission', subRoutes);
app.use('/api/problem', proRoutes);
app.use('/api/judge', judgeRoute);
app.use('/api/users', userRoutes);

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