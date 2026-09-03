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
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-xl">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Restricted RBAC Access</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Problem creation is restricted to users with <span className="text-purple-400 font-semibold">Admin</span> or{' '}
          <span className="text-cyan-400 font-semibold">Moderator</span> roles.
          Your current role is <span className="text-slate-200 font-semibold">{user?.role || 'Guest'}</span>.
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Return to Problemset
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel & Back
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
          <ShieldAlert className="w-3.5 h-3.5" />
          Role: {user?.role?.toUpperCase()}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Create New Problem</h1>
          <p className="text-slate-400 text-sm mt-1">
            Author a new competitive programming challenge with test cases and resource limits.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Problem Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Subarray Sum Equals K"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Difficulty & Limits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Difficulty *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                      difficulty === d
                        ? d === 'easy'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : d === 'medium'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Time Limit (ms) *
              </label>
              <input
                type="number"
                min={100}
                max={15000}
                required
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Memory Limit */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                Memory Limit (MB) *
              </label>
              <input
                type="number"
                min={16}
                max={2048}
                required
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Tags
            </label>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:text-rose-400 transition-colors ml-0.5"
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
                className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />

              <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 self-center mr-1">Suggestions:</span>
                {COMMON_TAGS.map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => addTag(ct)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer"
                  >
                    +{ct}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Statement */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Problem Statement *
            </label>
            <textarea
              required
              rows={6}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Describe the problem, input format, and output format..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans leading-relaxed"
            />
          </div>

          {/* Constraints */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Constraints
            </label>
            <textarea
              rows={3}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="e.g. 1 <= N <= 10^5&#10;-10^9 <= A[i] <= 10^9"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Editorial */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Editorial / Solution Notes
            </label>
            <textarea
              rows={3}
              value={editorial}
              onChange={(e) => setEditorial(e.target.value)}
              placeholder="Explanation, time/space complexity analysis, and solution approach..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Dynamic Test Cases Builder */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Test Cases ({testCases.length}) *
                </h3>
                <p className="text-xs text-slate-400">
                  Include sample cases (visible to users) and hidden validation cases for judging.
                </p>
              </div>

              <button
                type="button"
                onClick={addTestCase}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Test Case
              </button>
            </div>

            <div className="space-y-4">
              {testCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-400">
                        Case #{idx + 1}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.isSample}
                          onChange={(e) => updateTestCase(idx, 'isSample', e.target.checked)}
                          className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Sample / Public Test Case</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTestCase(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Remove test case"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Input</span>
                      <textarea
                        required
                        rows={3}
                        value={tc.input}
                        onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                        placeholder="Raw input data..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 mt-1 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Expected Output</span>
                      <textarea
                        required
                        rows={3}
                        value={tc.output}
                        onChange={(e) => updateTestCase(idx, 'output', e.target.value)}
                        placeholder="Expected output data..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-emerald-300 mt-1 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
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
