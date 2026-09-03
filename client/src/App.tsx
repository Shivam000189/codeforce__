import React, { useState, useCallback } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ProblemList } from './components/ProblemList';
import { ProblemDetail } from './components/ProblemDetail';
import { ProblemCreate } from './components/ProblemCreate';
import { ToastContainer, type ToastMessage } from './components/Toast';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'problemset' | 'create' | 'detail'>('problemset');
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleOpenAuth = useCallback((mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const handleAuthSuccess = useCallback((msg: string) => {
    addToast('success', msg);
  }, [addToast]);

  const handleSelectProblem = useCallback((id: string) => {
    setSelectedProblemId(id);
    setActiveTab('detail');
  }, []);

  const handleNavigate = useCallback((tab: 'problemset' | 'create') => {
    setActiveTab(tab);
    if (tab === 'problemset') {
      setSelectedProblemId(null);
    }
  }, []);

  const handleNavigateCreate = useCallback(() => {
    setActiveTab('create');
  }, []);

  const handleProblemCreated = useCallback((newProblemId: string) => {
    setSelectedProblemId(newProblemId);
    setActiveTab('detail');
  }, []);

  const handleProblemListError = useCallback((msg: string) => {
    addToast('error', msg);
  }, [addToast]);

  const handleProblemDetailBack = useCallback(() => {
    setActiveTab('problemset');
  }, []);

  const handleProblemCreateBack = useCallback(() => {
    setActiveTab('problemset');
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'problemset' && (
          <ProblemList
            onSelectProblem={handleSelectProblem}
            onNavigateCreate={handleNavigateCreate}
            onError={handleProblemListError}
          />
        )}

        {activeTab === 'detail' && selectedProblemId && (
          <ProblemDetail
            problemId={selectedProblemId}
            onBack={handleProblemDetailBack}
            onOpenAuth={handleOpenAuth}
            onToast={addToast}
          />
        )}

        {activeTab === 'create' && (
          <ProblemCreate
            onBack={handleProblemCreateBack}
            onProblemCreated={handleProblemCreated}
            onToast={addToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Codeforces OJ &bull; High-Performance Competitive Programming Platform</span>
          <span className="text-slate-600">Built with React, Express, MongoDB, & Docker/GCC</span>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={handleCloseAuth}
        onSuccess={handleAuthSuccess}
      />

      {/* Floating Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
