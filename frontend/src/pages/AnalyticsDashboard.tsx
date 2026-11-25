import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Smile,
  Meh,
  Frown,
  Activity,
  Layers,
  Calendar,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { getAnalytics } from '../services/api';
import type { AnalyticsData } from '../types/sentiment';
import { useTheme } from '../context/ThemeContext';

const COLORS = {
  Positive: '#10b981', // emerald-500
  Neutral: '#64748b',  // slate-500
  Negative: '#f43f5e', // rose-500
};

export const AnalyticsDashboard: React.FC<{ onNavigateToWorkspace?: () => void }> = ({
  onNavigateToWorkspace,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Theme-aware chart colors
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  if (loading && !analytics) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading analytics from database...
        </p>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">Analytics Error</h3>
        <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const total = analytics?.total ?? 0;
  const posCount = analytics?.sentiment_distribution.Positive ?? 0;
  const neuCount = analytics?.sentiment_distribution.Neutral ?? 0;
  const negCount = analytics?.sentiment_distribution.Negative ?? 0;

  // Donut chart data
  const pieData = [
    { name: 'Positive', value: posCount, color: COLORS.Positive },
    { name: 'Neutral', value: neuCount, color: COLORS.Neutral },
    { name: 'Negative', value: negCount, color: COLORS.Negative },
  ].filter((d) => d.value > 0);

  // Bar comparison data
  const barData = [
    { name: 'Positive', count: posCount, fill: COLORS.Positive },
    { name: 'Neutral', count: neuCount, fill: COLORS.Neutral },
    { name: 'Negative', count: negCount, fill: COLORS.Negative },
  ];

  // Timeline data filtered
  const rawTimeline = analytics?.timeline || [];
  const filteredTimeline =
    dateFilter === '7d'
      ? rawTimeline.slice(-7)
      : dateFilter === '30d'
      ? rawTimeline.slice(-30)
      : rawTimeline;

  return (
    <div className="space-y-6">
      {/* Header with Title and Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Sentiment Analytics Dashboard
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              Live DB Stats
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time aggregate intelligence extracted from actual sentiment classification history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {(['all', '7d', '30d'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setDateFilter(opt)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  dateFilter === opt
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt === 'all' ? 'All Time' : opt === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchStats}
            disabled={loading}
            title="Refresh analytics data"
            className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyses */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
            <span>Total Analyses</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {total}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Avg Confidence: <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.round((analytics?.average_confidence ?? 0) * 100)}%</span>
          </div>
        </div>

        {/* Positive Count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-2">
            <span>Positive Sentiments</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
              <Smile className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {posCount}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-500 mt-1">
            {analytics?.sentiment_percentages.Positive ?? 0}% of all records
          </div>
        </div>

        {/* Neutral Count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-xs font-semibold mb-2">
            <span>Neutral Sentiments</span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
              <Meh className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-700 dark:text-slate-200">
            {neuCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {analytics?.sentiment_percentages.Neutral ?? 0}% of all records
          </div>
        </div>

        {/* Negative Count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-semibold mb-2">
            <span>Negative Sentiments</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600">
              <Frown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
            {negCount}
          </div>
          <div className="text-[11px] text-rose-700 dark:text-rose-500 mt-1">
            {analytics?.sentiment_percentages.Negative ?? 0}% of all records
          </div>
        </div>
      </div>

      {/* Empty State when Database has no records */}
      {total === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Analytics Data Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            The analytics dashboard renders live metrics directly from your classification history.
            Enter and analyze text in the workspace to generate live charts.
          </p>
          {onNavigateToWorkspace && (
            <button
              onClick={onNavigateToWorkspace}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
            >
              Go to Analysis Workspace
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Charts Row 1: Donut Distribution & Bar Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Sentiment Distribution Ratio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Proportion of Positive, Neutral, and Negative predictions
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#000',
                      }}
                    />
                    <Legend
                      formatter={(val) => (
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {val}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Comparison Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Sentiment Volume Comparison
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Total record count per sentiment category
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" stroke={textColor} fontSize={12} />
                    <YAxis stroke={textColor} fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#000',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Analyses Count">
                      {barData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Timeline Trend & Confidence Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timeline Line Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Sentiment Trend Over Time
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Daily volume of classifications by date
              </p>
              <div className="h-64 w-full">
                {filteredTimeline.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No timeline points recorded yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="date" stroke={textColor} fontSize={11} />
                      <YAxis stroke={textColor} fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          borderColor: tooltipBorder,
                          borderRadius: '8px',
                          color: isDark ? '#fff' : '#000',
                        }}
                      />
                      <Legend
                        formatter={(val) => (
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {val}
                          </span>
                        )}
                      />
                      <Line type="monotone" dataKey="Positive" stroke={COLORS.Positive} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Neutral" stroke={COLORS.Neutral} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Negative" stroke={COLORS.Negative} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Confidence Distribution Bar Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Model Confidence Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Frequency of predictions grouped by model confidence percentage
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.confidence_buckets || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="range" stroke={textColor} fontSize={11} />
                    <YAxis stroke={textColor} fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#000',
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Predictions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Database Predictions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Recent Classifications Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Latest predictions persisted in the SQLite database
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Sentiment</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Text Snippet</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analytics?.recent_predictions.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.sentiment === 'Positive'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : rec.sentiment === 'Negative'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {rec.sentiment}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {Math.round(rec.confidence * 100)}%
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate" title={rec.text}>
                        &ldquo;{rec.text}&rdquo;
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(rec.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
