import React from 'react';
import { Brain, Sparkles, Lightbulb } from 'lucide-react';

interface AIExplanationProps {
  explanation: string;
}

export const AIExplanation: React.FC<AIExplanationProps> = ({ explanation }) => {
  if (!explanation) return null;

  const isLLM = !explanation.includes('Rule-based insight');

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/40 p-6 sm:p-7 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              AI Linguistic Reasoning &amp; Explanation
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Why the machine learning model classified this text
            </span>
          </div>
        </div>

        <span
          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
            isLLM
              ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800'
              : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
          }`}
        >
          {isLLM ? 'OpenAI GPT-4o-mini' : 'Analytical Fallback'}
        </span>
      </div>

      <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
        <div className="flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="flex-1">{explanation}</p>
        </div>
      </div>
    </div>
  );
};
