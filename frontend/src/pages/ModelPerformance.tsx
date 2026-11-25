import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Sliders,
  BarChart2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { getModelInfo } from '../services/api';
import type { ModelMetadata } from '../types/sentiment';
import { useTheme } from '../context/ThemeContext';

export const ModelPerformance: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [modelInfo, setModelInfo] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>({ row: 0, col: 0 });

  const fetchModelInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getModelInfo();
      setModelInfo(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load model metadata';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  if (loading && !modelInfo) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading TweetEval test-split model evaluation and confusion matrix...
        </p>
      </div>
    );
  }

  if (error && !modelInfo) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">Model Metadata Error</h3>
        <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
        <button
          onClick={fetchModelInfo}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const metrics = modelInfo?.test_metrics;
  const confMatrix = metrics?.confusion_matrix || [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const perClass = metrics?.per_class || {};
  const oneVsRest = modelInfo?.one_vs_rest || {};
  const tuning = modelInfo?.tuning_history || [];
  const actualVsPred = modelInfo?.actual_vs_predicted || [];

  // F1 comparison chart data
  const f1ChartData = [
    {
      name: 'Negative',
      f1_score: Number(((perClass['Negative']?.f1_score ?? 0) * 100).toFixed(1)),
      fill: '#f43f5e',
    },
    {
      name: 'Neutral',
      f1_score: Number(((perClass['Neutral']?.f1_score ?? 0) * 100).toFixed(1)),
      fill: '#64748b',
    },
    {
      name: 'Positive',
      f1_score: Number(((perClass['Positive']?.f1_score ?? 0) * 100).toFixed(1)),
      fill: '#10b981',
    },
    {
      name: 'Macro Avg',
      f1_score: Number(((metrics?.macro_f1 ?? 0) * 100).toFixed(1)),
      fill: '#6366f1',
    },
  ];

  // Precision vs Recall comparison chart data
  const precRecData = [
    {
      sentiment: 'Negative',
      precision: Number(((perClass['Negative']?.precision ?? 0) * 100).toFixed(1)),
      recall: Number(((perClass['Negative']?.recall ?? 0) * 100).toFixed(1)),
    },
    {
      sentiment: 'Neutral',
      precision: Number(((perClass['Neutral']?.precision ?? 0) * 100).toFixed(1)),
      recall: Number(((perClass['Neutral']?.recall ?? 0) * 100).toFixed(1)),
    },
    {
      sentiment: 'Positive',
      precision: Number(((perClass['Positive']?.precision ?? 0) * 100).toFixed(1)),
      recall: Number(((perClass['Positive']?.recall ?? 0) * 100).toFixed(1)),
    },
  ];

  // Heatmap intensity calculation
  const maxVal = Math.max(...confMatrix.flat());
  const getHeatmapColor = (val: number, isDiagonal: boolean, isSelected: boolean) => {
    const intensity = maxVal > 0 ? val / maxVal : 0;
    const ringClass = isSelected ? 'ring-2 ring-indigo-500 scale-[1.02]' : '';
    if (isDiagonal) {
      if (intensity > 0.7) return `bg-emerald-600 text-white font-bold ${ringClass}`;
      if (intensity > 0.4) return `bg-emerald-500 text-white font-semibold ${ringClass}`;
      return `bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-medium ${ringClass}`;
    } else {
      if (intensity > 0.5) return `bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 font-medium ${ringClass}`;
      if (intensity > 0.25) return `bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 ${ringClass}`;
      return `bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ${ringClass}`;
    }
  };

  const getCellExplanation = (row: number, col: number) => {
    const classNames = ['Negative', 'Neutral', 'Positive'];
    const actual = classNames[row];
    const predicted = classNames[col];
    const count = confMatrix[row]?.[col] ?? 0;

    if (row === col) {
      return {
        title: `True ${actual} (Correct Classification)`,
        text: `${count.toLocaleString()} actual ${actual} test tweets were correctly classified as ${actual}.`,
        badge: 'Correct Prediction',
        badgeColor: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300',
      };
    } else {
      return {
        title: `Misclassification (${actual} → ${predicted})`,
        text: `${count.toLocaleString()} actual ${actual} test tweets were mistakenly predicted as ${predicted}.`,
        badge: 'Prediction Error',
        badgeColor: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300',
      };
    }
  };

  const activeExplanation = selectedCell ? getCellExplanation(selectedCell.row, selectedCell.col) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Model Performance &amp; Evaluation Dashboard
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              TweetEval Held-Out Test Split
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Empirical evaluation results computed from 12,284 unseen benchmark test tweets using Scikit-Learn metrics.
          </p>
        </div>

        <button
          onClick={fetchModelInfo}
          disabled={loading}
          className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {/* Dataset & Split Identity Card */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              Benchmark Dataset Integrity Assurance
            </h4>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300 leading-relaxed">
              Evaluated strictly on the held-out <span className="font-semibold text-indigo-900 dark:text-white">TweetEval Sentiment Test Split (12,284 tweets)</span>.
              Model evaluation metrics are completely isolated from live user predictions to prevent evaluation leakage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono font-semibold text-indigo-900 dark:text-indigo-200 shrink-0 bg-white/70 dark:bg-slate-900/60 px-4 py-2 rounded-xl border border-indigo-200/50 dark:border-indigo-800/40">
          <div>Train: 45,615</div>
          <div>•</div>
          <div>Val: 2,000</div>
          <div>•</div>
          <div className="text-indigo-600 dark:text-indigo-400 font-bold">Test: 12,284</div>
        </div>
      </div>

      {/* 1. Overall Test Metrics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Overall Accuracy</div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {((metrics?.accuracy ?? 0) * 100).toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">12,284 test tweets</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Macro F1-Score</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {((metrics?.macro_f1 ?? 0) * 100).toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">SemEval benchmark standard</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Weighted F1-Score</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {((metrics?.weighted_f1 ?? 0) * 100).toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Weighted by support</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Macro Precision</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {((metrics?.macro_precision ?? 0) * 100).toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all 3 classes</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Macro Recall</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {((metrics?.macro_recall ?? 0) * 100).toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sensitivity average</div>
        </div>
      </div>

      {/* 2. Interactive 3x3 Heatmap Confusion Matrix */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            Interactive 3&times;3 Test Confusion Matrix Heatmap
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Click any cell to inspect classification explanation
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Rows represent actual ground-truth sentiments; columns represent model predictions.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Heatmap Grid */}
          <div className="lg:col-span-2 overflow-x-auto">
            <div className="min-w-[360px] text-xs">
              {/* Header: Predicted labels on X-Axis */}
              <div className="grid grid-cols-4 gap-2 mb-2 text-center">
                <div className="text-slate-400 font-bold text-[10px] uppercase self-end pb-1">
                  Actual (Y) \ Pred (X)
                </div>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold rounded-lg border border-rose-200/50">
                  Pred Negative
                </div>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg border border-slate-200/50 dark:border-slate-700">
                  Pred Neutral
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200/50">
                  Pred Positive
                </div>
              </div>

              {/* Rows: Actual labels on Y-Axis */}
              {['Negative', 'Neutral', 'Positive'].map((actualLabel, rowIdx) => (
                <div key={actualLabel} className="grid grid-cols-4 gap-2 mb-2 text-center">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 rounded-lg flex items-center justify-center border border-slate-200/50 dark:border-slate-700">
                    {actualLabel}
                  </div>
                  {confMatrix[rowIdx]?.map((val, colIdx) => {
                    const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                    return (
                      <button
                        key={colIdx}
                        onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                        className={`p-3 rounded-xl transition flex flex-col items-center justify-center cursor-pointer shadow-2xs ${getHeatmapColor(
                          val,
                          rowIdx === colIdx,
                          isSelected
                        )}`}
                      >
                        <span className="text-lg font-black">{val.toLocaleString()}</span>
                        <span className="text-[10px] opacity-80 mt-0.5">
                          {rowIdx === colIdx ? 'Correct (TP)' : 'Misclassified'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Cell Inspector */}
          {activeExplanation && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeExplanation.badgeColor}`}>
                  {activeExplanation.badge}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Cell [{selectedCell?.row}, {selectedCell?.col}]</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeExplanation.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeExplanation.text}
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                Total Test Agreement: <span className="font-bold text-emerald-600">{(confMatrix[0][0] + confMatrix[1][1] + confMatrix[2][2]).toLocaleString()} / 12,284 (57.84%)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. One-vs-Rest TP, TN, FP, FN Detailed Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            One-vs-Rest (OvR) Classification Breakdown
          </h3>
          <span className="text-xs font-semibold text-slate-400">TP &bull; TN &bull; FP &bull; FN</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Calculated by decomposing the 3-class problem into individual binary One-vs-Rest evaluations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['Negative', 'Neutral', 'Positive'] as const).map((cls) => {
            const ovr = oneVsRest[cls] || { tp: 0, tn: 0, fp: 0, fn: 0, precision: 0, recall: 0, f1_score: 0 };
            const borderColor =
              cls === 'Positive'
                ? 'border-emerald-200 dark:border-emerald-800'
                : cls === 'Negative'
                ? 'border-rose-200 dark:border-rose-800'
                : 'border-slate-200 dark:border-slate-700';

            return (
              <div
                key={cls}
                className={`p-5 rounded-2xl border ${borderColor} bg-slate-50/50 dark:bg-slate-800/40 space-y-4`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {cls} (Class {cls === 'Negative' ? 0 : cls === 'Neutral' ? 1 : 2})
                  </h4>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    F1: {((ovr.f1_score ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>

                {/* 2x2 Grid for OvR */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-100 dark:border-emerald-900">
                    <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">True Pos (TP)</div>
                    <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">{ovr.tp.toLocaleString()}</div>
                    <div className="text-[9px] text-emerald-600 dark:text-emerald-500 mt-0.5">Correct {cls}</div>
                  </div>

                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">True Neg (TN)</div>
                    <div className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{ovr.tn.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Correct Non-{cls}</div>
                  </div>

                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-100 dark:border-rose-900">
                    <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">False Pos (FP)</div>
                    <div className="text-base font-extrabold text-rose-700 dark:text-rose-400 mt-0.5">{ovr.fp.toLocaleString()}</div>
                    <div className="text-[9px] text-rose-600 dark:text-rose-500 mt-0.5">Spurious {cls}</div>
                  </div>

                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-100 dark:border-amber-900">
                    <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">False Neg (FN)</div>
                    <div className="text-base font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{ovr.fn.toLocaleString()}</div>
                    <div className="text-[9px] text-amber-600 dark:text-amber-500 mt-0.5">Missed {cls}</div>
                  </div>
                </div>

                {/* Rates */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Precision [TP / (TP+FP)]:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{((ovr.precision ?? 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recall [TP / (TP+FN)]:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{((ovr.recall ?? 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sum (TP+TN+FP+FN):</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">{(ovr.tp + ovr.tn + ovr.fp + ovr.fn).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Visualizations: F1-Score & Precision vs Recall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class-wise F1 Comparison */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Class-wise F1-Score Comparison (%)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Harmonic mean of precision and recall per polarity and overall macro average
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={f1ChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} />
                <YAxis stroke={textColor} fontSize={12} domain={[0, 100]} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'F1-Score']}
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '8px',
                    color: isDark ? '#fff' : '#000',
                  }}
                />
                <Bar dataKey="f1_score" radius={[6, 6, 0, 0]} name="F1-Score (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Precision vs Recall Side-by-Side */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Precision vs. Recall Comparison (%)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Exactness (Precision) vs Completeness (Recall) across sentiment categories
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={precRecData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="sentiment" stroke={textColor} fontSize={12} />
                <YAxis stroke={textColor} fontSize={12} domain={[0, 100]} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`]}
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '8px',
                    color: isDark ? '#fff' : '#000',
                  }}
                />
                <Legend />
                <Bar dataKey="precision" fill="#6366f1" radius={[4, 4, 0, 0]} name="Precision (%)" />
                <Bar dataKey="recall" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Recall (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Actual vs Predicted Class Distribution Comparison */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Actual vs. Predicted Class Distribution (12,284 Test Tweets)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Compares true ground-truth class prevalence in TweetEval test split against model predictions
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={actualVsPred}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="sentiment" stroke={textColor} fontSize={12} />
              <YAxis stroke={textColor} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '8px',
                  color: isDark ? '#fff' : '#000',
                }}
              />
              <Legend />
              <Bar dataKey="actual" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Actual Ground Truth" />
              <Bar dataKey="predicted" fill="#10b981" radius={[4, 4, 0, 0]} name="Model Predictions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Hyperparameter Tuning History Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Validation Hyperparameter Regularization Tuning ($C$)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Evaluated across candidate $C$ values on the 2,000 validation split samples
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 uppercase text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Regularization $C$</th>
                <th className="py-2.5 px-3">Val Accuracy</th>
                <th className="py-2.5 px-3">Val Macro F1</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tuning.map((t) => {
                const isOptimal = t.C === modelInfo?.hyperparameters.best_c;
                return (
                  <tr
                    key={t.C}
                    className={
                      isOptimal
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/40 font-semibold'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    }
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      C = {t.C.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3">{(t.val_accuracy * 100).toFixed(2)}%</td>
                    <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400 font-bold">
                      {(t.val_macro_f1 * 100).toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3">
                      {isOptimal ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Selected Optimal
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Candidate</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
