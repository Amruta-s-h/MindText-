import React, { useState } from 'react';
import { Send, Sparkles, Trash2, HelpCircle } from 'lucide-react';

interface TextInputProps {
  onAnalyze: (text: string) => Promise<void>;
  loading: boolean;
}

const SAMPLE_TEXTS = [
  {
    label: 'Positive Sample',
    color: 'hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700',
    text: 'I absolutely love this new update! Everything works smoothly and looks gorgeous.',
  },
  {
    label: 'Neutral Sample',
    color: 'hover:border-slate-300 hover:bg-slate-50 text-slate-700',
    text: 'The package arrived today as scheduled according to the tracking number.',
  },
  {
    label: 'Negative Sample',
    color: 'hover:border-rose-300 hover:bg-rose-50 text-rose-700',
    text: 'The flight was delayed by 4 hours and the customer support was completely unhelpful.',
  },
];

export const TextInput: React.FC<TextInputProps> = ({ onAnalyze, loading }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Please enter some text to analyze.');
      return;
    }
    setError(null);
    await onAnalyze(trimmed);
  };

  const handleSelectSample = (sample: string) => {
    setText(sample);
    setError(null);
  };

  const handleClear = () => {
    setText('');
    setError(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
      <div className="flex items-center justify-between mb-3">
        <label htmlFor="sentiment-input" className="block text-sm font-bold text-slate-800">
          Enter Text for Sentiment Analysis
        </label>
        <span className="text-xs text-slate-400 font-mono">
          {text.length} / 2000 chars
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            id="sentiment-input"
            rows={4}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            maxLength={2000}
            placeholder="Type or paste a tweet, customer review, feedback, or thought here..."
            className={`w-full p-4 rounded-xl border text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition resize-y min-h-[110px] ${
              error
                ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
            }`}
          />
        </div>

        {error && (
          <p className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}

        {/* Quick Sample Prompts */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            Try Samples:
          </span>
          {SAMPLE_TEXTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSample(sample.text)}
              disabled={loading}
              className={`text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-white font-medium transition cursor-pointer disabled:opacity-50 ${sample.color}`}
            >
              {sample.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClear}
            disabled={!text || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Classifying with ML...</span>
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
  );
};
