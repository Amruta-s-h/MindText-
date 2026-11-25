import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Server,
  Key,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { HealthResponse } from '../types/sentiment';

interface SettingsPageProps {
  health: HealthResponse | null;
  onRefreshHealth: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ health, onRefreshHealth }) => {
  const { theme, setTheme } = useTheme();
  const [clearedNotice, setClearedNotice] = useState(false);

  const handleClearLocalStorage = () => {
    if (window.confirm('Clear all local UI preferences and cached state?')) {
      localStorage.removeItem('mindtext_theme');
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            System &amp; Application Settings
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
            Preferences &amp; Diagnostics
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure appearance, inspect backend connectivity, and manage local storage.
        </p>
      </div>

      {clearedNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Local storage preferences reset successfully.</span>
        </div>
      )}

      {/* 1. Theme Configuration */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          Appearance &amp; Display Theme
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Choose between Dark, Light, or system color scheme. Preferences persist in localStorage.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-2 ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold shadow-xs'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs">Light Theme</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-2 ${
              theme === 'dark'
                ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 font-bold shadow-xs'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span className="text-xs">Dark Theme</span>
          </button>

          <button
            onClick={() => {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              setTheme(prefersDark ? 'dark' : 'light');
            }}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-center transition cursor-pointer flex flex-col items-center gap-2"
          >
            <Monitor className="w-5 h-5 text-slate-400" />
            <span className="text-xs">System Default</span>
          </button>
        </div>
      </div>

      {/* 2. Backend & ML Diagnostics */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            Backend API Diagnostics
          </h3>
          <button
            onClick={onRefreshHealth}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
          >
            Ping Status
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Real-time service status, model availability, and database bindings
        </p>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="font-semibold text-slate-700 dark:text-slate-300">API Connection:</span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {health?.status === 'ok' ? 'Online & Healthy' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="font-semibold text-slate-700 dark:text-slate-300">ML Model Status:</span>
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              {health?.model_status === 'loaded' ? '✓ Pipeline In-Memory' : 'Unavailable'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Database Binding:</span>
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              SQLite (instance/mindtext.db)
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="font-semibold text-slate-700 dark:text-slate-300">AI Reasoning Engine:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {health?.ai_service_mode === 'openai_llm' ? 'OpenAI GPT-4o-mini' : 'Analytical Fallback (Active)'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. OpenAI Key Configuration Guide */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Key className="w-4 h-4 text-violet-600" />
          OpenAI API Key Integration
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          To activate generative LLM explanations alongside the ML model:
        </p>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-mono space-y-1">
          <div>1. Open <span className="font-bold text-indigo-600">backend/.env</span></div>
          <div>2. Set <span className="font-bold">OPENAI_API_KEY=sk-your-actual-key-here</span></div>
          <div>3. Restart the Flask server (<span className="text-slate-500">python app.py</span>)</div>
        </div>

        <p className="text-[11px] text-slate-400 mt-2">
          Note: If omitted, MindText automatically runs using its built-in rule-based analytical engine without errors.
        </p>
      </div>

      {/* 4. Local Storage Cleanup */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Reset Local Client Preferences
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Clears cached theme choices and temporary browser state. (Database records are not deleted).
          </p>
        </div>

        <button
          onClick={handleClearLocalStorage}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Cache</span>
        </button>
      </div>
    </div>
  );
};
