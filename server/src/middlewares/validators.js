const { z } = require('zod');

exports.registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

exports.updateUserRoleSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin'])
});

exports.loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

exports.createProblemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  statement: z.string().min(1, 'Statement is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string().min(1)).optional(),
  timeLimit: z.number().int().min(100).max(15000).optional(),
  memoryLimit: z.number().int().min(16).max(2048).optional(),
  constraints: z.string().optional(),
  editorial: z.string().optional(),
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