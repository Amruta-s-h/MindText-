import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Trash2,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { SentimentResult } from '../components/SentimentResult';
import { AIExplanation } from '../components/AIExplanation';
import type { PredictionData } from '../types/sentiment';

interface WorkspacePageProps {
  onAnalyze: (text: string) => Promise<void>;
  loading: boolean;
  currentPrediction: PredictionData | null;
  errorMessage: string | null;
  onClearError: () => void;
  recentPredictions: PredictionData[];
  onSelectRecent: (prediction: PredictionData) => void;
  onNavigateToHistory: () => void;
}

const SAMPLE_TEXTS = [
  {
    label: 'Positive Sample',
    color: 'hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    text: 'I absolutely love this new update! Everything works smoothly and looks gorgeous.',
  },
  {
    label: 'Neutral Sample',
    color: 'hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
    text: 'The package arrived today as scheduled according to the tracking number.',
  },
  {
    label: 'Negative Sample',
    color: 'hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300',
    text: 'The flight was delayed by 4 hours and the customer support was completely unhelpful.',
  },
];

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  onAnalyze,
  loading,
  currentPrediction,
  errorMessage,
  onClearError,
  recentPredictions,
  onSelectRecent,
  onNavigateToHistory,
}) => {
  const [text, setText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Compute word count
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setValidationError('Please enter some text to analyze.');
      return;
    }
    setValidationError(null);
    onClearError();
    await onAnalyze(trimmed);
  };

  const handleSelectSample = (sample: string) => {
    setText(sample);
    setValidationError(null);
    onClearError();
  };

  const handleClear = () => {
    setText('');
    setValidationError(null);
    onClearError();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Sentiment Analysis Workspace
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
            Logistic Regression + AI
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enter any statement, customer review, or social media tweet to classify sentiment polarity with full probability distribution.
        </p>
      </div>

      {/* Main Workspace Grid: Text Input and Live Result */}
      <div className="grid grid-cols-1 gap-6">
        {/* Input Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-7">
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="workspace-input" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              Input Text
            </label>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{text.length} / 2000 chars</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                id="workspace-input"
                rows={5}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (validationError) setValidationError(null);
                  if (errorMessage) onClearError();
                }}
                maxLength={2000}
                placeholder="Type or paste any tweet, product feedback, or sentence to evaluate its emotional polarity..."
                className={`w-full p-4 rounded-xl border text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition resize-y min-h-[130px] ${
                  validationError || errorMessage
                    ? 'border-rose-400 dark:border-rose-600 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950'
                    : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950'
                }`}
              />
            </div>

            {(validationError || errorMessage) && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                {validationError || errorMessage}
              </p>
            )}

            {/* Sample Chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Try Sample Prompts:
              </span>
              {SAMPLE_TEXTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(sample.text)}
                  disabled={loading}
                  className={`text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium transition cursor-pointer disabled:opacity-50 ${sample.color}`}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {/* Bottom Controls */}
            <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClear}
                disabled={!text || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Text
              </button>

              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-100 dark:shadow-none transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Evaluating TF-IDF &amp; LogReg...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Analyze Sentiment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Prediction Results Display */}
        {currentPrediction ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <SentimentResult prediction={currentPrediction} />
            <AIExplanation explanation={currentPrediction.ai_explanation} />
          </div>
        ) : (
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Prediction Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Enter text above or click one of the sample prompt chips to generate an instant ML classification with calibrated probability scores.
            </p>
          </div>
        )}
      </div>

      {/* Recent Predictions Quick Strip */}
      {recentPredictions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Recent Workspace Inferences
            </h3>
            <button
              onClick={onNavigateToHistory}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentPredictions.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectRecent(item)}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                  <span
                    className={
                      item.sentiment === 'Positive'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : item.sentiment === 'Negative'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }
                  >
                    {item.sentiment}
                  </span>
                  <span className="text-slate-400 font-mono">{Math.round(item.confidence * 100)}%</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
