import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  HardDrive,
  Copy,
  Check,
  Play,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileCode2,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Problem, Submission, Difficulty } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ProblemDetailProps {
  problemId: string;
  onBack: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const STARTER_CODE: Record<'python' | 'cpp' | 'c', string> = {
  python: `# Solution in Python 3
import sys

def solve():
    # Read input from standard input
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    # Write your solution here
    pass

if __name__ == '__main__':
    solve()
`,
  cpp: `// Solution in C++17
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Write your solution here

    return 0;
}
`,
  c: `/* Solution in C11 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Write your solution here

    return 0;
}
`
};

export const ProblemDetail: React.FC<ProblemDetailProps> = ({
  problemId,
  onBack,
  onOpenAuth,
  onToast
}) => {
  const { isAuthenticated } = useAuth();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<'python' | 'cpp' | 'c'>('python');
  const [code, setCode] = useState<string>(STARTER_CODE.python);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showEditorial, setShowEditorial] = useState<boolean>(false);

  // Submission & Judging state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [rejudging, setRejudging] = useState<boolean>(false);

  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let isSubscribed = true;

    const fetchProblem = async () => {
      setLoading(true);
      try {
        const data = await api.problems.getById(problemId, { signal: controller.signal });
        if (isSubscribed) {
          setProblem(data);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        if (isSubscribed) {
          onToastRef.current('error', err.message || 'Failed to fetch problem details');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchProblem();

    return () => {
      isSubscribed = false;
      controller.abort();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [problemId]);

  const handleLanguageChange = (newLang: 'python' | 'cpp' | 'c') => {
    // If current code is unmodified starter template, replace with new starter template
    if (code === STARTER_CODE[language]) {
      setCode(STARTER_CODE[newLang]);
    }
    setLanguage(newLang);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const pollSubmissionStatus = (subId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    let attempts = 0;
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const subData = await api.submissions.getStatus(subId);
        setSubmission(subData);

        if (subData.status !== 'pending' || attempts >= 30) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (subData.status === 'correct') {
            onToast('success', 'Accepted! All test cases passed successfully 🎉');
          } else if (subData.status === 'incorrect') {
            onToast('warning', `Verdict: ${subData.error || 'Incorrect Answer'}`);
          }
        }
      } catch (err) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    }, 1500);
  };

  const handleSubmitCode = async () => {
    if (!isAuthenticated) {
      onToast('warning', 'Please sign in to submit your solution.');
      onOpenAuth('login');
      return;
    }

    if (!code.trim()) {
      onToast('warning', 'Source code cannot be empty.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submissions.submit(problemId, {
        language,
        sourceCode: code
      });

      onToast('info', 'Submission queued. Judging test cases...');
      setSubmission({
        submissionId: res.submissionId,
        status: 'pending',
        problem: problem?.title || problemId,
        user: '',
        language
      });

      pollSubmissionStatus(res.submissionId);
    } catch (err: any) {
      onToast('error', err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejudge = async () => {
    if (!submission?.submissionId) return;
    setRejudging(true);
    try {
      await api.judge.rejudge(submission.submissionId);
      onToast('info', 'Re-judging submission in progress...');
      pollSubmissionStatus(submission.submissionId);
    } catch (err: any) {
      onToast('error', err.message || 'Failed to trigger re-judge');
    } finally {
      setRejudging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Loading problem details...</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Problem not found</h2>
        <p className="text-slate-400 text-sm">The problem you are trying to view does not exist.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Back to Problemset
        </button>
      </div>
    );
  }

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case 'easy':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Easy
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Medium
          </span>
        );
      case 'hard':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Hard
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Problemset
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Problem ID:</span>
          <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
            {problem._id}
          </span>
        </div>
      </div>

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Problem Details & Constraints */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            {/* Header info */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {getDifficultyBadge(problem.difficulty)}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium ml-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Time Limit: {problem.timeLimit || 2000} ms</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium ml-2">
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Memory Limit: {problem.memoryLimit || 256} MB</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {problem.title}
              </h1>

              {problem.tags && problem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {problem.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-700/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Problem Statement */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Statement
              </h3>
              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                {problem.statement}
              </div>
            </div>

            {/* Constraints */}
            {problem.constraints && (
              <div className="space-y-2 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Constraints
                </h3>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                  {problem.constraints}
                </div>
              </div>
            )}

            {/* Sample Test Cases */}
            {problem.testCases && problem.testCases.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sample Test Cases
                </h3>
                <div className="space-y-3">
                  {problem.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400">
                          Sample #{idx + 1}
                        </span>
                        <button
                          onClick={() => copyToClipboard(tc.input, idx)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy input</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase">Input</span>
                          <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap mt-1 overflow-x-auto">
                            {tc.input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase">Expected Output</span>
                          <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 whitespace-pre-wrap mt-1 overflow-x-auto">
                            {tc.output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editorial / Solution Notes */}
            {problem.editorial && (
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => setShowEditorial(!showEditorial)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/60 border border-slate-800 text-xs font-bold text-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Problem Editorial & Insights
                  </div>
                  {showEditorial ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showEditorial && (
                  <div className="mt-2.5 p-4 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans animate-in fade-in duration-200">
                    {problem.editorial}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: In-Browser Code Editor & Execution Results */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col">
            {/* Editor Toolbar */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Code Editor
                </span>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {(['python', 'cpp', 'c'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-all cursor-pointer ${
                      language === lang
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang === 'cpp' ? 'C++17' : lang === 'c' ? 'C11' : 'Python 3'}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Textarea Area */}
            <div className="relative bg-slate-950 font-mono text-xs">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={18}
                spellCheck={false}
                placeholder="Write your code here..."
                className="w-full p-4 bg-transparent text-slate-100 placeholder-slate-600 font-mono text-xs leading-relaxed focus:outline-none resize-y border-none"
              />
            </div>

            {/* Action Bottom Bar */}
            <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>⚡ Timeout: {problem.timeLimit || 2000}ms</span>
              </div>

              <button
                onClick={handleSubmitCode}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run & Submit Code
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Submission Verdict / Result Panel */}
          {submission && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  Judging Verdict
                </h3>
                {submission.status !== 'pending' && (
                  <button
                    onClick={handleRejudge}
                    disabled={rejudging}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${rejudging ? 'animate-spin' : ''}`} />
                    Re-judge
                  </button>
                )}
              </div>

              {/* Status Banner */}
              {submission.status === 'pending' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Judging in Progress...</p>
                    <p className="text-[11px] text-amber-200/80">
                      Executing code against test cases in isolated runtime.
                    </p>
                  </div>
                </div>
              )}

              {submission.status === 'correct' && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-extrabold text-emerald-300">Accepted (AC)</p>
                    <p className="text-xs text-emerald-400/80">
                      Solution passed all test cases within time and memory constraints.
                    </p>
                  </div>
                </div>
              )}

              {submission.status === 'incorrect' && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300">
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                  <div>
                    <p className="text-sm font-extrabold text-rose-300">
                      {submission.error || 'Wrong Answer (WA)'}
                    </p>
                    <p className="text-xs text-rose-400/80">
                      Output mismatched expected solution or exceeded runtime bounds.
                    </p>
                  </div>
                </div>
              )}

              {/* Detailed Test Case Results Table */}
              {submission.results && submission.results.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Test Case Breakdown ({submission.results.filter((r) => r.passed).length}/
                    {submission.results.length} Passed)
                  </span>

                  <div className="space-y-2">
                    {submission.results.map((res, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs font-mono ${
                          res.passed
                            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                            : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold flex items-center gap-1.5">
                            {res.passed ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            Test Case #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {res.executionTime !== undefined ? `${res.executionTime} ms` : ''}
                          </span>
                        </div>

                        {!res.passed && (
                          <div className="space-y-1 text-[11px] mt-2 pt-2 border-t border-rose-500/20">
                            {res.error && (
                              <div>
                                <span className="text-rose-400 font-bold">Error: </span>
                                <span>{res.error}</span>
                              </div>
                            )}
                            {res.actualOutput && (
                              <div>
                                <span className="text-rose-400 font-bold">Your Output: </span>
                                <span>{res.actualOutput}</span>
                              </div>
                            )}
                            {res.expectedOutput && (
                              <div>
                                <span className="text-emerald-400 font-bold">Expected: </span>
                                <span>{res.expectedOutput}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
