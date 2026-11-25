export type SentimentType = 'Positive' | 'Neutral' | 'Negative';

export interface User {
  id: number;
  full_name: string;
  email: string;
  created_at: string;
  total_predictions?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  error?: string;
}

export interface ClassProbabilities {
  negative: number;
  neutral: number;
  positive: number;
}

export interface PredictionData {
  id: number;
  user_id?: number | null;
  text: string;
  cleaned_text: string;
  sentiment: SentimentType;
  sentiment_code: number;
  confidence: number;
  probabilities: ClassProbabilities;
  ai_explanation: string;
  created_at: string;
}

export interface PredictResponse {
  success: boolean;
  data: PredictionData;
  error?: string;
}

export interface HistoryResponse {
  success: boolean;
  total: number;
  count: number;
  offset: number;
  limit: number;
  user_id?: number | null;
  data: PredictionData[];
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  deleted_id?: number;
  deleted_count?: number;
  error?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  model_status: string;
  database_status: string;
  ai_service_mode: string;
  timestamp: string;
}

export interface ConfidenceBucket {
  range: string;
  count: number;
}

export interface TimelineDataPoint {
  date: string;
  total: number;
  Positive: number;
  Neutral: number;
  Negative: number;
}

export interface AnalyticsData {
  total: number;
  user_id?: number | null;
  sentiment_distribution: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  sentiment_percentages: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  average_confidence: number;
  confidence_buckets: ConfidenceBucket[];
  timeline: TimelineDataPoint[];
  recent_predictions: PredictionData[];
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  error?: string;
}

export interface ClassMetric {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface OneVsRestMetric {
  class: string;
  class_index: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1_score: number;
  actual_support: number;
  predicted_support: number;
  descriptions: {
    tp: string;
    tn: string;
    fp: string;
    fn: string;
  };
}

export interface ActualVsPredictedPoint {
  sentiment: string;
  actual: number;
  predicted: number;
  actual_pct: number;
  predicted_pct: number;
}

export interface ModelMetadata {
  model_name: string;
  dataset: string;
  label_mapping: Record<string, string>;
  class_names: string[];
  random_seed: number;
  hyperparameters: {
    best_c: number;
    max_features: number;
    ngram_range: [number, number];
    solver: string;
    max_iter: number;
  };
  tuning_history: Array<{
    C: number;
    val_accuracy: number;
    val_macro_f1: number;
  }>;
  test_metrics: {
    accuracy: number;
    macro_precision: number;
    macro_recall: number;
    macro_f1: number;
    weighted_f1: number;
    confusion_matrix: number[][];
    per_class: Record<string, ClassMetric>;
  };
  one_vs_rest?: Record<string, OneVsRestMetric>;
  actual_vs_predicted?: ActualVsPredictedPoint[];
  dataset_split_info?: {
    dataset: string;
    source: string;
    train_samples: number;
    validation_samples: number;
    test_samples: number;
    classes: string[];
  };
  saved_at: string;
  artifacts: {
    pipeline: string;
    vectorizer: string;
    classifier: string;
  };
}

export interface ModelInfoResponse {
  success: boolean;
  data: ModelMetadata;
  error?: string;
}
