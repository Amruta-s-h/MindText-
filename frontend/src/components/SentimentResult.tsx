import React from 'react';
import { Smile, Meh, Frown, BarChart3, Clock } from 'lucide-react';
import type { PredictionData } from '../types/sentiment';

interface SentimentResultProps {
  prediction: PredictionData;
}

export const SentimentResult: React.FC<SentimentResultProps> = ({ prediction }) => {
  const { sentiment, confidence, probabilities, text, cleaned_text, created_at } = prediction;

  const sentimentConfig = {
    Positive: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
      badgeBg: 'bg-emerald-600',
      text: 'text-emerald-900 dark:text-emerald-200',
      icon: <Smile className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
      tag: 'Positive Sentiment',
    },
    Neutral: {
      bg: 'bg-slate-50 dark:bg-slate-900/60',
      border: 'border-slate-300 dark:border-slate-700',
      badgeBg: 'bg-slate-600 dark:bg-slate-700',
      text: 'text-slate-900 dark:text-slate-100',
      icon: <Meh className="w-6 h-6 text-slate-600 dark:text-slate-400" />,
      tag: 'Neutral Sentiment',
    },
    Negative: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-200 dark:border-rose-800',
      badgeBg: 'bg-rose-600',
      text: 'text-rose-900 dark:text-rose-200',
      icon: <Frown className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
      tag: 'Negative Sentiment',
    },
  }[sentiment] || {
    bg: 'bg-slate-50 dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    badgeBg: 'bg-slate-600',
    text: 'text-slate-900 dark:text-slate-100',
    icon: <Meh className="w-6 h-6 text-slate-600" />,
    tag: 'Sentiment',
  };

  const negPct = Math.round((probabilities?.negative ?? 0) * 100);
  const neuPct = Math.round((probabilities?.neutral ?? 0) * 100);
  const posPct = Math.round((probabilities?.positive ?? 0) * 100);

  return (
    <div className={`rounded-2xl border ${sentimentConfig.border} ${sentimentConfig.bg} p-6 sm:p-7 shadow-xs transition-all`}>
      {/* Header with Classification Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xs border border-slate-100 dark:border-slate-700">
            {sentimentConfig.icon}
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
              ML Model Classification
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black tracking-tight ${sentimentConfig.text}`}>
                {sentiment}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full text-white font-semibold ${sentimentConfig.badgeBg}`}>
                {Math.round(confidence * 100)}% Confidence
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Input Summary */}
      <div className="py-4 border-b border-slate-200/60 dark:border-slate-800">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Analyzed Text:</div>
        <p className="text-sm text-slate-800 dark:text-slate-200 italic bg-white/70 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          &ldquo;{text}&rdquo;
        </p>
        {cleaned_text && cleaned_text !== text && (
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Preprocessed input:</span> &ldquo;{cleaned_text}&rdquo;
          </div>
        )}
      </div>

      {/* Probability Distribution Meter */}
      <div className="pt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Class Probability Distribution:
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Logistic Regression Calibrated</span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-3 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${negPct}%` }}
            title={`Negative: ${negPct}%`}
            className="bg-rose-500 transition-all duration-500"
          />
          <div
            style={{ width: `${neuPct}%` }}
            title={`Neutral: ${neuPct}%`}
            className="bg-slate-400 dark:bg-slate-500 transition-all duration-500"
          />
          <div
            style={{ width: `${posPct}%` }}
            title={`Positive: ${posPct}%`}
            className="bg-emerald-500 transition-all duration-500"
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-1 text-center">
          <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700">
            <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Negative
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{negPct}%</div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
              Neutral
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{neuPct}%</div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700">
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Positive
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{posPct}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
