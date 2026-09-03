import type {
  UserRole,
  Problem,
  PaginatedProblems,
  Submission,
  Difficulty,
  TestCase
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...(options.headers || {})
    };

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (networkError: any) {
      if (networkError?.name === 'AbortError') {
        throw networkError;
      }
      throw new Error('Network error: Unable to connect to server. Please ensure the backend is running.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(data.message || 'Rate limit exceeded: Too many requests. Please wait a moment.');
      }
      if (response.status === 401) {
        throw new Error(data.message || 'Access denied: Please log in to continue.');
      }
      if (response.status === 403) {
        throw new Error(data.message || 'Permission denied: Admin or Moderator access required.');
      }
      if (data.errors) {
        const fieldErrors = Object.entries(data.errors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
          .join(' | ');
        throw new Error(fieldErrors || data.message || 'Validation failed');
      }
      throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // Auth endpoints
  auth = {
    login: async (email: string, password: string): Promise<{ token: string; userId: string; role: UserRole; message: string }> => {
      return this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },

    register: async (name: string, email: string, password: string, role?: UserRole): Promise<{ token: string; userId: string; role: UserRole; message: string }> => {
      return this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, ...(role && { role }) })
      });
    }
  };

  // Problem endpoints
  problems = {
    list: async (
      params: {
        page?: number;
        limit?: number;
        search?: string;
        difficulty?: string;
        tags?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      } = {},
      options?: { signal?: AbortSignal }
    ): Promise<PaginatedProblems> => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.search) query.append('search', params.search);
      if (params.difficulty) query.append('difficulty', params.difficulty);
      if (params.tags) query.append('tags', params.tags);
      if (params.sortBy) query.append('sortBy', params.sortBy);
      if (params.sortOrder) query.append('sortOrder', params.sortOrder);

      const qs = query.toString();
      return this.request<PaginatedProblems>(`/problem${qs ? `?${qs}` : ''}`, {
        signal: options?.signal
      });
    },

    getById: async (id: string, options?: { signal?: AbortSignal }): Promise<Problem> => {
      return this.request<Problem>(`/problem/${id}`, {
        signal: options?.signal
      });
    },

    create: async (data: {
      title: string;
      statement: string;
      difficulty: Difficulty;
      tags?: string[];
      timeLimit?: number;
      memoryLimit?: number;
      constraints?: string;
      editorial?: string;
      testCases?: TestCase[];
    }): Promise<{ message: string; problemId: string }> => {
      return this.request<{ message: string; problemId: string }>('/problem/create-problem', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  };

  // Submission endpoints
  submissions = {
    submit: async (problemId: string, data: {
      language: 'c' | 'cpp' | 'python';
      sourceCode: string;
    }): Promise<{ message: string; submissionId: string; status: string }> => {
      return this.request<{ message: string; submissionId: string; status: string }>(`/submission/submit/${problemId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    getStatus: async (submissionId: string): Promise<Submission> => {
      return this.request<Submission>(`/submission/${submissionId}`);
    }
  };

  // Judge endpoint
  judge = {
    rejudge: async (submissionId: string): Promise<{ message: string; result?: string }> => {
      return this.request<{ message: string; result?: string }>(`/judge/${submissionId}`, {
        method: 'POST'
      });
    }
  };
}

export const api = new ApiClient();
