import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Brain,
  BarChart3,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onOpenWorkspace: () => void;
  onOpenAnalytics: () => void;
  onOpenModelInfo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenWorkspace,
  onOpenAnalytics,
  onOpenModelInfo,
}) => {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Production-Grade AI/ML Sentiment Analytics Platform
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
          Analyze Emotion, Sentiment &amp; Tone with{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
            Real Machine Learning
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          MindText combines classic statistical NLP (TF-IDF + Logistic Regression trained on 45,615 TweetEval benchmark tweets) with modern generative AI reasoning for deep, explainable sentiment intelligence.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenWorkspace}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-100 dark:shadow-none transition cursor-pointer"
          >
            <span>Open Sentiment Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAnalytics}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-sm font-semibold rounded-xl shadow-2xs transition cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>View Analytics Dashboard</span>
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Feature 1 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Trained Machine Learning Model
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Real TF-IDF vectorizer (15,000 unigrams + bigrams) with sublinear scaling and calibrated Logistic Regression tuned on TweetEval benchmark validation data.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenModelInfo}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Confusion Matrix &amp; Metrics</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            AI Explanation &amp; Reasoning
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Integrates OpenAI GPT-4o-mini to interpret emotional cues and explain why the classifier assigned that sentiment, backed by an intelligent offline fallback mode.
          </p>
          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Multi-class probability breakdown</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero-crash graceful fallback</span>
            </li>
          </ul>
        </div>

        {/* Feature 3 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Interactive Analytics &amp; DB Persistence
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            SQLAlchemy ORM logging every prediction in SQLite. Interactive Recharts donut charts, volume bars, trend timelines, and one-click CSV export.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenAnalytics}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Analytics Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Tech Architecture Stack Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 text-center">
          Production End-to-End Architecture
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-400 mb-0.5">Frontend</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">React + TS</div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">Vite + Tailwind v4</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-400 mb-0.5">Backend REST</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Python Flask</div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">CORS + App Factory</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-400 mb-0.5">Machine Learning</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">TweetEval Model</div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">TF-IDF + LogReg (C=5.0)</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-400 mb-0.5">Persistence &amp; AI</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">SQLite &amp; OpenAI</div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">SQLAlchemy + GPT-4o-mini</div>
          </div>
        </div>
      </div>
    </div>
  );
};
