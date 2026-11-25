import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, type NavTab } from './components/Navbar';
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
import { AlertTriangle } from 'lucide-react';

function MindTextApp() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('landing');

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

  // 2. Fetch Recent Predictions
  const fetchRecent = useCallback(async () => {
    try {
      const res = await getHistory({ limit: 5 });
      setRecentPredictions(res.data || []);
      if (!currentPrediction && res.data && res.data.length > 0) {
        setCurrentPrediction(res.data[0]);
      }
    } catch {
      setRecentPredictions([]);
    }
  }, [currentPrediction]);

  useEffect(() => {
    fetchHealth();
    fetchRecent();
  }, [fetchHealth, fetchRecent, user]);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans antialiased transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        health={health}
        healthLoading={healthLoading}
        onRefreshHealth={fetchHealth}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Backend Offline Banner */}
        {!health && !healthLoading && (
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

        {/* View Switcher */}
        {currentTab === 'landing' && (
          <LandingPage
            onOpenWorkspace={() => setCurrentTab('workspace')}
            onOpenAnalytics={() => setCurrentTab('analytics')}
            onOpenModelInfo={() => setCurrentTab('model')}
          />
        )}

        {currentTab === 'workspace' && (
          <WorkspacePage
            onAnalyze={handleAnalyze}
            loading={predictionLoading}
            currentPrediction={currentPrediction}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
            recentPredictions={recentPredictions}
            onSelectRecent={(item) => setCurrentPrediction(item)}
            onNavigateToHistory={() => setCurrentTab('history')}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsDashboard onNavigateToWorkspace={() => setCurrentTab('workspace')} />
        )}

        {currentTab === 'model' && <ModelPerformance />}

        {currentTab === 'history' && (
          <HistoryPage onHistoryChange={fetchRecent} />
        )}

        {currentTab === 'settings' && (
          <SettingsPage health={health} onRefreshHealth={fetchHealth} />
        )}

        {currentTab === 'login' && (
          <LoginPage
            onSuccess={() => {
              setCurrentTab('workspace');
              fetchRecent();
            }}
            onNavigateToRegister={() => setCurrentTab('register')}
            onContinueAsGuest={() => setCurrentTab('workspace')}
          />
        )}

        {currentTab === 'register' && (
          <RegisterPage
            onSuccess={() => {
              setCurrentTab('workspace');
              fetchRecent();
            }}
            onNavigateToLogin={() => setCurrentTab('login')}
            onContinueAsGuest={() => setCurrentTab('workspace')}
          />
        )}

        {currentTab === 'profile' && (
          <ProfilePage
            onLogoutSuccess={() => {
              setCurrentTab('landing');
              setCurrentPrediction(null);
              fetchRecent();
            }}
          />
        )}
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
        <MindTextApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
