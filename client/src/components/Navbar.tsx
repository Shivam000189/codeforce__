import React from 'react';
import { Terminal, PlusCircle, LogIn, LogOut, ShieldAlert, ShieldCheck, User as UserIcon, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'problemset' | 'create' | 'detail';
  onNavigate: (tab: 'problemset' | 'create') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onNavigate,
  onOpenAuth
}) => {
  const { user, isAuthenticated, logout, isAdminOrModerator, isAdmin, isModerator } = useAuth();

  const getRoleBadge = () => {
    if (!user) return null;
    if (isAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldAlert className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (isModerator) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <ShieldCheck className="w-3 h-3" />
          Moderator
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <UserIcon className="w-3 h-3" />
        User
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => onNavigate('problemset')}
            className="flex items-center gap-3 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xs group-hover:opacity-95 transition-all">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-gray-900">
                  CODEFORCES
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 tracking-wide uppercase">
                  OJ
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Online Judge & Execution Platform</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('problemset')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                activeTab === 'problemset' || activeTab === 'detail'
                  ? 'bg-gray-100 text-gray-900 shadow-xs border border-gray-200 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              Problemset
            </button>

            {isAdminOrModerator && (
              <button
                onClick={() => onNavigate('create')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-gray-100 text-gray-900 shadow-xs border border-gray-200 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-purple-600" />
                Create Problem
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold">
                  RBAC
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Right Auth controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center font-bold text-xs text-gray-800 border border-gray-300">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900 max-w-[140px] truncate">
                    {user.name || user.email}
                  </span>
                  <div className="mt-0.5">{getRoleBadge()}</div>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 shadow-xs transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-blue-600" />
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
