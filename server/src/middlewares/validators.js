const { z } = require('zod');

exports.registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

exports.loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

exports.createProblemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  statement: z.string().min(1, 'Statement is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  testCases: z.array(z.object({
    input: z.string(),
    output: z.string(),
    isSample: z.boolean().default(false)
  })).optional()
});

exports.submitCodeSchema = z.object({
  language: z.enum(['c', 'cpp', 'python']),
  sourceCode: z.string().min(1, 'Source code cannot be empty')
});