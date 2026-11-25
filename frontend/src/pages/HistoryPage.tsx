import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trash2,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Clock,
  Smile,
  Meh,
  Frown,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { getHistory, deleteHistoryItem, clearAllHistory } from '../services/api';
import type { PredictionData, SentimentType } from '../types/sentiment';

export const HistoryPage: React.FC<{ onHistoryChange?: () => void }> = ({ onHistoryChange }) => {
  const [history, setHistory] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<SentimentType | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');

  // Deleting state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchHistoryList = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getHistory({ limit: 100 });
      setHistory(res.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve history';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistoryList();
  }, [fetchHistoryList]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (onHistoryChange) onHistoryChange();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete record';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all prediction records from SQLite?')) {
      return;
    }
    setClearing(true);
    try {
      await clearAllHistory();
      setHistory([]);
      if (onHistoryChange) onHistoryChange();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear history';
      alert(msg);
    } finally {
      setClearing(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (history.length === 0) {
      alert('No prediction history to export.');
      return;
    }

    const headers = [
      'ID',
      'Date_UTC',
      'Sentiment',
      'Sentiment_Code',
      'Confidence',
      'Prob_Negative',
      'Prob_Neutral',
      'Prob_Positive',
      'Input_Text',
      'Cleaned_Text',
      'AI_Explanation',
    ];

    const rows = history.map((r) => [
      r.id,
      `"${r.created_at}"`,
      r.sentiment,
      r.sentiment_code,
      r.confidence,
      r.probabilities?.negative ?? 0,
      r.probabilities?.neutral ?? 0,
      r.probabilities?.positive ?? 0,
      `"${(r.text || '').replace(/"/g, '""')}"`,
      `"${(r.cleaned_text || '').replace(/"/g, '""')}"`,
      `"${(r.ai_explanation || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mindtext_sentiment_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Records Memo
  const filteredHistory = useMemo(() => {
    const now = new Date();
    return history.filter((item) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textMatch = item.text.toLowerCase().includes(query);
        const explanationMatch = (item.ai_explanation || '').toLowerCase().includes(query);
        if (!textMatch && !explanationMatch) return false;
      }

      // 2. Sentiment filter
      if (sentimentFilter !== 'All' && item.sentiment !== sentimentFilter) {
        return false;
      }

      // 3. Date filter
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.created_at);
        const diffMs = now.getTime() - itemDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === '7d' && diffDays > 7) return false;
        if (dateFilter === '30d' && diffDays > 30) return false;
      }

      return true;
    });
  }, [history, searchQuery, sentimentFilter, dateFilter]);

  const getSentimentPill = (sentiment: SentimentType) => {
    switch (sentiment) {
      case 'Positive':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Smile className="w-3 h-3" />
            Positive
          </span>
        );
      case 'Negative':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Frown className="w-3 h-3" />
            Negative
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Meh className="w-3 h-3" />
            Neutral
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Analysis History &amp; Data Export
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              {history.length} {history.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, inspect, and export your SQLite database prediction logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{clearing ? 'Clearing...' : 'Clear All'}</span>
              </button>
            </>
          )}

          <button
            onClick={fetchHistoryList}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search analysis history by keywords..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Sentiment Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs overflow-x-auto">
            <span className="text-slate-400 text-[11px] font-medium ml-1 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Sentiment:
            </span>
            {(['All', 'Positive', 'Neutral', 'Negative'] as const).map((sent) => (
              <button
                key={sent}
                onClick={() => setSentimentFilter(sent)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                  sentimentFilter === sent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {sent}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {(['all', 'today', '7d', '30d'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                  dateFilter === d
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d === 'all' ? 'All' : d === 'today' ? 'Today' : d === '7d' ? '7D' : '30D'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Items List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6">
        {loading && history.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Retrieving SQLite prediction logs...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Analysis Records Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery || sentimentFilter !== 'All' || dateFilter !== 'all'
                ? 'Try clearing or relaxing your search query and filters.'
                : 'Enter and analyze text in the workspace to build your prediction history.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/60 transition flex flex-col sm:flex-row items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getSentimentPill(item.sentiment)}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {Math.round(item.confidence * 100)}% Confidence
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                    &ldquo;{item.text}&rdquo;
                  </p>

                  {/* Probabilities Mini Bar */}
                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Probabilities:</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      Neg: {Math.round((item.probabilities?.negative ?? 0) * 100)}%
                    </span>
                    <span className="text-slate-500">
                      Neu: {Math.round((item.probabilities?.neutral ?? 0) * 100)}%
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Pos: {Math.round((item.probabilities?.positive ?? 0) * 100)}%
                    </span>
                  </div>

                  {item.ai_explanation && (
                    <p className="text-[11px] text-indigo-900 dark:text-indigo-200 bg-indigo-50/60 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-100/60 dark:border-indigo-900/40 mt-2 italic leading-relaxed">
                      💡 {item.ai_explanation}
                    </p>
                  )}
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    title="Delete record from SQLite"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition cursor-pointer disabled:opacity-50"
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
