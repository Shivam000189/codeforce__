import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Clock,
  HardDrive
} from 'lucide-react';
import type { Difficulty, TestCase } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ProblemCreateProps {
  onBack: () => void;
  onProblemCreated: (problemId: string) => void;
  onToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const COMMON_TAGS = [
  'array',
  'string',
  'dynamic-programming',
  'math',
  'greedy',
  'hash-table',
  'binary-search',
  'tree',
  'graph',
  'two-pointers',
  'sorting',
  'bit-manipulation'
];

export const ProblemCreate: React.FC<ProblemCreateProps> = ({
  onBack,
  onProblemCreated,
  onToast
}) => {
  const { user, isAdminOrModerator } = useAuth();

  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['array']);
  const [timeLimit, setTimeLimit] = useState<number>(2000);
  const [memoryLimit, setMemoryLimit] = useState<number>(256);
  const [constraints, setConstraints] = useState('');
  const [editorial, setEditorial] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: '5\n1 2 3 4 5\n', output: '15\n', isSample: true }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', output: '', isSample: false }]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length === 1) {
      onToast('warning', 'A problem must contain at least one test case.');
      return;
    }
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdminOrModerator) {
      onToast('error', 'Only Admins and Moderators are authorized to create problems.');
      return;
    }

    if (!title.trim() || !statement.trim()) {
      onToast('warning', 'Please fill in problem title and statement.');
      return;
    }

    if (testCases.length === 0) {
      onToast('warning', 'Please provide at least one test case.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.problems.create({
        title,
        statement,
        difficulty,
        tags,
        timeLimit: Number(timeLimit),
        memoryLimit: Number(memoryLimit),
        constraints,
        editorial,
        testCases
      });

      onToast('success', 'Problem created and published to Problemset!');
      onProblemCreated(response.problemId);
    } catch (err: any) {
      onToast('error', err.message || 'Failed to create problem');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdminOrModerator) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Restricted RBAC Access</h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Problem creation is restricted to users with <span className="text-purple-600 font-semibold">Admin</span> or{' '}
          <span className="text-blue-600 font-semibold">Moderator</span> roles.
          Your current role is <span className="text-gray-900 font-semibold">{user?.role || 'Guest'}</span>.
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          Return to Problemset
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-3.5 py-2 rounded-lg transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel & Back
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
          <ShieldAlert className="w-3.5 h-3.5" />
          Role: {user?.role?.toUpperCase()}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-xs space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Create New Problem</h1>
          <p className="text-gray-600 text-sm mt-1">
            Author a new competitive programming challenge with test cases and resource limits.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Problem Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Subarray Sum Equals K"
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          {/* Difficulty & Limits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Difficulty *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold capitalize transition-all cursor-pointer ${
                      difficulty === d
                        ? d === 'easy'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                          : d === 'medium'
                          ? 'bg-amber-50 border-amber-400 text-amber-700'
                          : 'bg-rose-50 border-rose-400 text-rose-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Time Limit (ms) *
              </label>
              <input
                type="number"
                min={100}
                max={15000}
                required
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Memory Limit */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                Memory Limit (MB) *
              </label>
              <input
                type="number"
                min={16}
                max={2048}
                required
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(Number(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Tags
            </label>
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:text-rose-600 transition-colors ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Type a tag and press Enter or comma..."
                className="w-full bg-transparent text-xs text-gray-900 placeholder-gray-400 focus:outline-none"
              />

              <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-200">
                <span className="text-[10px] text-gray-500 self-center mr-1">Suggestions:</span>
                {COMMON_TAGS.map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => addTag(ct)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-white text-gray-700 hover:text-gray-900 border border-gray-300 cursor-pointer"
                  >
                    +{ct}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Statement */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Problem Statement *
            </label>
            <textarea
              required
              rows={6}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Describe the problem, input format, and output format..."
              className="w-full bg-white border border-gray-300 rounded-lg p-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans leading-relaxed"
            />
          </div>

          {/* Constraints */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Constraints
            </label>
            <textarea
              rows={3}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="e.g. 1 <= N <= 10^5&#10;-10^9 <= A[i] <= 10^9"
              className="w-full bg-white border border-gray-300 rounded-lg p-3.5 text-xs font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Editorial */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Editorial / Solution Notes
            </label>
            <textarea
              rows={3}
              value={editorial}
              onChange={(e) => setEditorial(e.target.value)}
              placeholder="Explanation, time/space complexity analysis, and solution approach..."
              className="w-full bg-white border border-gray-300 rounded-lg p-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Dynamic Test Cases Builder */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Test Cases ({testCases.length}) *
                </h3>
                <p className="text-xs text-gray-500">
                  Include sample cases (visible to users) and hidden validation cases for judging.
                </p>
              </div>

              <button
                type="button"
                onClick={addTestCase}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Test Case
              </button>
            </div>

            <div className="space-y-4">
              {testCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-blue-600">
                        Case #{idx + 1}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.isSample}
                          onChange={(e) => updateTestCase(idx, 'isSample', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Sample / Public Test Case</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTestCase(idx)}
                      className="text-gray-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                      title="Remove test case"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Input</span>
                      <textarea
                        required
                        rows={3}
                        value={tc.input}
                        onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                        placeholder="Raw input data..."
                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs font-mono text-gray-900 mt-1 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Expected Output</span>
                      <textarea
                        required
                        rows={3}
                        value={tc.output}
                        onChange={(e) => updateTestCase(idx, 'output', e.target.value)}
                        placeholder="Expected output data..."
                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs font-mono text-emerald-700 font-semibold mt-1 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing Problem...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Publish Problem
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
