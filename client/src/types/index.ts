export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  userId: string;
  name?: string;
  email: string;
  role: UserRole;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface TestCase {
  _id?: string;
  input: string;
  output: string;
  isSample: boolean;
}

export interface Problem {
  _id: string;
  title: string;
  statement: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  constraints: string;
  editorial: string;
  testCases?: TestCase[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedProblems {
  totalProblems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  count: number;
  problems: Problem[];
}

export type SubmissionStatus = 'pending' | 'correct' | 'incorrect';

export interface TestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string | null;
  executionTime?: number;
}

export interface Submission {
  submissionId: string;
  status: SubmissionStatus;
  problem: {
    _id: string;
    title: string;
  } | string;
  user: {
    _id: string;
    name: string;
    email: string;
  } | string;
  language: 'c' | 'cpp' | 'python';
  submittedAt?: string;
  output?: string;
  error?: string;
  results?: TestCaseResult[];
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
