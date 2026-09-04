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
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Loading problem details...</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Problem not found</h2>
        <p className="text-gray-500 text-sm">The problem you are trying to view does not exist.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all cursor-pointer"
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
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Easy
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'hard':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
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
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-3.5 py-2 rounded-lg transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Problemset
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">Problem ID:</span>
          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 border border-gray-200">
            {problem._id}
          </span>
        </div>
      </div>

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Problem Details & Constraints */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header info */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {getDifficultyBadge(problem.difficulty)}
                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium ml-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Time Limit: {problem.timeLimit || 2000} ms</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium ml-2">
                  <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                  <span>Memory Limit: {problem.memoryLimit || 256} MB</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {problem.title}
              </h1>

              {problem.tags && problem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {problem.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-700 border border-gray-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Problem Statement */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Statement
              </h3>
              <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap font-sans">
                {problem.statement}
              </div>
            </div>

            {/* Constraints */}
            {problem.constraints && (
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Constraints
                </h3>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs text-gray-800 whitespace-pre-wrap">
                  {problem.constraints}
                </div>
              </div>
            )}

            {/* Sample Test Cases */}
            {problem.testCases && problem.testCases.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Sample Test Cases
                </h3>
                <div className="space-y-3">
                  {problem.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-600">
                          Sample #{idx + 1}
                        </span>
                        <button
                          onClick={() => copyToClipboard(tc.input, idx)}
                          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copied</span>
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
                          <span className="text-[11px] font-bold text-gray-500 uppercase">Input</span>
                          <pre className="p-2.5 rounded-lg bg-white border border-gray-200 text-xs font-mono text-gray-900 whitespace-pre-wrap mt-1 overflow-x-auto">
                            {tc.input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-gray-500 uppercase">Expected Output</span>
                          <pre className="p-2.5 rounded-lg bg-white border border-gray-200 text-xs font-mono text-emerald-700 font-semibold whitespace-pre-wrap mt-1 overflow-x-auto">
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
              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowEditorial(!showEditorial)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-800 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-blue-600">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Problem Editorial & Insights
                  </div>
                  {showEditorial ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {showEditorial && (
                  <div className="mt-2.5 p-4 rounded-xl bg-blue-50/40 border border-blue-200 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans animate-in fade-in duration-200">
                    {problem.editorial}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: In-Browser Code Editor & Execution Results */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
            {/* Editor Toolbar */}
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Code Editor
                </span>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
                {(['python', 'cpp', 'c'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold uppercase transition-all cursor-pointer ${
                      language === lang
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {lang === 'cpp' ? 'C++17' : lang === 'c' ? 'C11' : 'Python 3'}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Textarea Area */}
            <div className="relative bg-gray-900 font-mono text-xs">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={18}
                spellCheck={false}
                placeholder="Write your code here..."
                className="w-full p-4 bg-transparent text-gray-100 placeholder-gray-500 font-mono text-xs leading-relaxed focus:outline-none resize-y border-none"
              />
            </div>

            {/* Action Bottom Bar */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                <span>⚡ Timeout: {problem.timeLimit || 2000}ms</span>
              </div>

              <button
                onClick={handleSubmitCode}
                disabled={submitting}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
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
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  Judging Verdict
                </h3>
                {submission.status !== 'pending' && (
                  <button
                    onClick={handleRejudge}
                    disabled={rejudging}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 transition-all cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${rejudging ? 'animate-spin' : ''}`} />
                    Re-judge
                  </button>
                )}
              </div>

              {/* Status Banner */}
              {submission.status === 'pending' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-900">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Judging in Progress...</p>
                    <p className="text-[11px] text-amber-800">
                      Executing code against test cases in isolated runtime.
                    </p>
                  </div>
                </div>
              )}

              {submission.status === 'correct' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-emerald-900">Accepted (AC)</p>
                    <p className="text-xs text-emerald-800">
                      Solution passed all test cases within time and memory constraints.
                    </p>
                  </div>
                </div>
              )}

              {submission.status === 'incorrect' && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-900">
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-rose-900">
                      {submission.error || 'Wrong Answer (WA)'}
                    </p>
                    <p className="text-xs text-rose-800">
                      Output mismatched expected solution or exceeded runtime bounds.
                    </p>
                  </div>
                </div>
              )}

              {/* Detailed Test Case Results Table */}
              {submission.results && submission.results.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">
                    Test Case Breakdown ({submission.results.filter((r) => r.passed).length}/
                    {submission.results.length} Passed)
                  </span>

                  <div className="space-y-2">
                    {submission.results.map((res, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs font-mono ${
                          res.passed
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/60 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold flex items-center gap-1.5">
                            {res.passed ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            )}
                            Test Case #{idx + 1}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {res.executionTime !== undefined ? `${res.executionTime} ms` : ''}
                          </span>
                        </div>

                        {!res.passed && (
                          <div className="space-y-1 text-[11px] mt-2 pt-2 border-t border-rose-200">
                            {res.error && (
                              <div>
                                <span className="text-rose-700 font-bold">Error: </span>
                                <span>{res.error}</span>
                              </div>
                            )}
                            {res.actualOutput && (
                              <div>
                                <span className="text-rose-700 font-bold">Your Output: </span>
                                <span>{res.actualOutput}</span>
                              </div>
                            )}
                            {res.expectedOutput && (
                              <div>
                                <span className="text-emerald-700 font-bold">Expected: </span>
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
