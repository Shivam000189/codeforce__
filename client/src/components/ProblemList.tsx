import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  HardDrive,
  Code,
  Loader2,
  Sparkles,
  Plus
} from 'lucide-react';
import type { Problem, Difficulty } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ProblemListProps {
  onSelectProblem: (id: string) => void;
  onNavigateCreate: () => void;
  onError: (msg: string) => void;
}

const POPULAR_TAGS = [
  'array',
  'string',
  'hash-table',
  'dynamic-programming',
  'math',
  'greedy',
  'binary-search',
  'tree',
  'graph',
  'two-pointers',
  'sorting',
  'bit-manipulation'
];

export const ProblemList: React.FC<ProblemListProps> = ({
  onSelectProblem,
  onNavigateCreate,
  onError
}) => {
  const { isAdminOrModerator } = useAuth();
  const onErrorRef = useRef(onError);

  // Keep error callback reference up to date without triggering re-fetches
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalProblems, setTotalProblems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search input by 350ms to prevent request flooding
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Main data fetching effect with AbortController cancellation
  useEffect(() => {
    const controller = new AbortController();
    let isSubscribed = true;

    const loadProblems = async () => {
      setLoading(true);
      try {
        const data = await api.problems.list(
          {
            page: currentPage,
            limit,
            search: debouncedSearch.trim() || undefined,
            difficulty: difficulty || undefined,
            tags: selectedTag || undefined,
            sortBy,
            sortOrder
          },
          { signal: controller.signal }
        );

        if (isSubscribed) {
          setProblems(data.problems || []);
          setTotalProblems(data.totalProblems || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        if (isSubscribed) {
          onErrorRef.current(err.message || 'Failed to fetch problemset');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    loadProblems();

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [currentPage, limit, debouncedSearch, difficulty, selectedTag, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setDifficulty('');
    setSelectedTag('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case 'easy':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Easy
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'hard':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Hard
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5" />
              Practice Competitive Programming
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Problemset & Algorithms
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Explore algorithm challenges, test with custom constraints, and run real-time code execution with GCC, G++, and Python3.
            </p>
          </div>

          {isAdminOrModerator && (
            <button
              onClick={onNavigateCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Create Problem
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search problems by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </form>

          {/* Difficulty Dropdown */}
          <div className="md:col-span-3">
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Sort Field & Order */}
          <div className="md:col-span-4 flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="createdAt">Date Created</option>
              <option value="title">Problem Title</option>
              <option value="difficulty">Difficulty</option>
              <option value="timeLimit">Time Limit</option>
              <option value="memoryLimit">Memory Limit</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" />
            Tags:
          </span>
          <button
            onClick={() => {
              setSelectedTag('');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTag === ''
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:text-gray-900 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            All
          </button>
          {POPULAR_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setSelectedTag(selectedTag === t ? '' : t);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer capitalize ${
                selectedTag === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:text-gray-900 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {t.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table / List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Loading problems...</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="py-20 px-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-500">
              <Code className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">No problems found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                No challenges matched your search filters. Try adjusting your query or clear filters.
              </p>
            </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Problem</th>
                  <th className="py-3.5 px-4">Difficulty</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Tags</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Limits</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {problems.map((problem) => (
                  <tr
                    key={problem._id}
                    onClick={() => onSelectProblem(problem._id)}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    {/* Title & Statement snippet */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {problem.title}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-1 mt-0.5 font-normal max-w-md">
                        {problem.statement}
                      </div>
                    </td>

                    {/* Difficulty */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getDifficultyBadge(problem.difficulty)}
                    </td>

                    {/* Tags */}
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {problem.tags && problem.tags.length > 0 ? (
                          problem.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-700 border border-gray-200"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                        {problem.tags && problem.tags.length > 3 && (
                          <span className="text-[10px] text-gray-500 font-medium self-center">
                            +{problem.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Limits */}
                    <td className="py-4 px-4 hidden md:table-cell whitespace-nowrap">
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1" title="Execution Time Limit">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {problem.timeLimit || 2000}ms
                        </span>
                        <span className="flex items-center gap-1" title="Memory Limit">
                          <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                          {problem.memoryLimit || 256}MB
                        </span>
                      </div>
                    </td>

                    {/* CTA */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProblem(problem._id);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-blue-600 text-gray-700 hover:text-white text-xs font-semibold border border-gray-300 hover:border-blue-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Code className="w-3.5 h-3.5" />
                        Solve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && problems.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-600 font-medium">
              Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * limit + 1}</span> to{' '}
              <span className="text-gray-900 font-bold">
                {Math.min(currentPage * limit, totalProblems)}
              </span>{' '}
              of <span className="text-gray-900 font-bold">{totalProblems}</span> problems
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs font-semibold text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
