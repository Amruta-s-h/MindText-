import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { ModelPerformance } from './pages/ModelPerformance';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import {
  getBackendHealth,
  predictSentiment,
  getHistory,
  ApiError,
} from './services/api';
import type { HealthResponse, PredictionData } from './types/sentiment';
import { AlertTriangle, Sparkles } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

function PublicAuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  return <>{children}</>;
}

function MindTextApp() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Backend Health State
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Prediction State
  const [currentPrediction, setCurrentPrediction] = useState<PredictionData | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recent Predictions cache for quick preview
  const [recentPredictions, setRecentPredictions] = useState<PredictionData[]>([]);

  // 1. Fetch Health
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await getBackendHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // 2. Fetch Recent Predictions (Authenticated Users Only)
  const fetchRecent = useCallback(async () => {
    if (!isAuthenticated) {
      setRecentPredictions([]);
      return;
    }
    try {
      const res = await getHistory({ limit: 5 });
      const items = res.data || [];
      setRecentPredictions(items);
      if (items.length > 0) {
        setCurrentPrediction((prev) => prev ?? items[0]);
      }
    } catch {
      setRecentPredictions([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchRecent();
    } else {
      setCurrentPrediction(null);
      setRecentPredictions([]);
      setErrorMessage(null);
    }
  }, [isAuthenticated, user, fetchRecent]);

  const handleLogoutSuccess = useCallback(() => {
    setCurrentPrediction(null);
    setRecentPredictions([]);
    setErrorMessage(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // 3. Handle Sentiment Prediction Submission
  const handleAnalyze = async (text: string) => {
    setPredictionLoading(true);
    setErrorMessage(null);

    try {
      const prediction = await predictSentiment(text);
      setCurrentPrediction(prediction);
      setRecentPredictions((prev) => [prediction, ...prev.slice(0, 4)]);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred during prediction.');
      }
    } finally {
      setPredictionLoading(false);
    }
  };

  // Prevent workspace or protected views from flashing while verifying stored JWT token
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 transition-colors duration-200">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none mb-4">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-900 dark:text-white">Verifying Session...</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Checking authentication with MindText server
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans antialiased transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        health={health}
        healthLoading={healthLoading}
        onRefreshHealth={fetchHealth}
        onLogoutSuccess={handleLogoutSuccess}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Backend Offline Banner (shown inside authenticated app) */}
        {isAuthenticated && !health && !healthLoading && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 flex-1">
              <span className="font-bold">Backend Server is Offline:</span> To execute real predictions, run{' '}
              <code className="font-mono bg-amber-100/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-semibold">
                python app.py
              </code>{' '}
              in <code className="font-mono">backend/</code>.
            </div>
          </div>
        )}

        {/* Route Switcher */}
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? '/workspace' : '/login'} replace />
            }
          />

          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <LoginPage onSuccess={() => fetchRecent()} />
              </PublicAuthRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicAuthRoute>
                <RegisterPage />
              </PublicAuthRoute>
            }
          />

          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <LandingPage
                  onOpenWorkspace={() => navigate('/workspace')}
                  onOpenAnalytics={() => navigate('/analytics')}
                  onOpenModelInfo={() => navigate('/model-evaluation')}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <WorkspacePage
                  onAnalyze={handleAnalyze}
                  loading={predictionLoading}
                  currentPrediction={currentPrediction}
                  errorMessage={errorMessage}
                  onClearError={() => setErrorMessage(null)}
                  recentPredictions={recentPredictions}
                  onSelectRecent={(item) => setCurrentPrediction(item)}
                  onNavigateToHistory={() => navigate('/history')}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsDashboard onNavigateToWorkspace={() => navigate('/workspace')} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/model-evaluation"
            element={
              <ProtectedRoute>
                <ModelPerformance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/model"
            element={
              <ProtectedRoute>
                <Navigate to="/model-evaluation" replace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage onHistoryChange={fetchRecent} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage
                  health={health}
                  onRefreshHealth={fetchHealth}
                  onLogoutSuccess={handleLogoutSuccess}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage onLogoutSuccess={handleLogoutSuccess} />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <Navigate to={isAuthenticated ? '/workspace' : '/login'} replace />
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            MindText AI Platform &bull; TweetEval Machine Learning Sentiment Classification
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
            <span>React + Vite + TypeScript</span>
            <span>&bull;</span>
            <span>Tailwind CSS</span>
            <span>&bull;</span>
            <span>Recharts</span>
            <span>&bull;</span>
            <span>Flask + Scikit-Learn</span>
            <span>&bull;</span>
            <span>SQLite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <MindTextApp />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
