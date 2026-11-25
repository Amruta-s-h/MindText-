import React, { useState } from 'react';
import { History, Trash2, Filter, AlertCircle, Clock, Smile, Meh, Frown } from 'lucide-react';
import type { PredictionData, SentimentType } from '../types/sentiment';

interface HistoryListProps {
  history: PredictionData[];
  loading: boolean;
  total: number;
  onDelete: (id: number) => Promise<void>;
  onClearAll: () => Promise<void>;
  onFilterChange: (sentiment?: SentimentType) => void;
  selectedFilter?: SentimentType;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  loading,
  total,
  onDelete,
  onClearAll,
  onFilterChange,
  selectedFilter,
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all analysis history records from the database?')) {
      return;
    }
    setClearing(true);
    try {
      await onClearAll();
    } finally {
      setClearing(false);
    }
  };

  const getSentimentPill = (sentiment: SentimentType) => {
    switch (sentiment) {
      case 'Positive':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Smile className="w-3 h-3" />
            Positive
          </span>
        );
      case 'Negative':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Frown className="w-3 h-3" />
            Negative
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Meh className="w-3 h-3" />
            Neutral
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Analysis History
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {total} {total === 1 ? 'Record' : 'Records'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real prediction logs persisted directly in the SQLite database
          </p>
        </div>

        {total > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing || loading}
            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearing ? 'Clearing...' : 'Clear All'}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 py-3 border-b border-slate-100 overflow-x-auto text-xs">
        <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" />
          Filter:
        </span>
        {(['All', 'Positive', 'Neutral', 'Negative'] as const).map((filterOption) => {
          const isActive =
            filterOption === 'All' ? !selectedFilter : selectedFilter === filterOption;
          return (
            <button
              key={filterOption}
              onClick={() => onFilterChange(filterOption === 'All' ? undefined : filterOption)}
              className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filterOption}
            </button>
          );
        })}
      </div>

      {/* List / Empty State */}
      <div className="mt-4">
        {loading && history.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading database history...
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No predictions found.</p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedFilter
                ? `No past predictions matching the '${selectedFilter}' filter.`
                : 'Enter a tweet or review above and click "Analyze Sentiment" to begin.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs bg-slate-50/50 hover:bg-white transition flex flex-col sm:flex-row items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {getSentimentPill(item.sentiment)}
                    <span className="text-xs font-bold text-slate-700">
                      {Math.round(item.confidence * 100)}% Confidence
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed">
                    &ldquo;{item.text}&rdquo;
                  </p>

                  {item.ai_explanation && (
                    <p className="text-xs text-indigo-900/80 mt-1.5 line-clamp-1 italic bg-indigo-50/60 px-2 py-1 rounded">
                      💡 {item.ai_explanation}
                    </p>
                  )}
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    title="Delete record from database"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
