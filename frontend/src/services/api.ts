import type {
  PredictResponse,
  HistoryResponse,
  DeleteResponse,
  HealthResponse,
  PredictionData,
  AnalyticsResponse,
  ModelInfoResponse,
  AnalyticsData,
  ModelMetadata,
  AuthResponse,
  User,
} from '../types/sentiment';

// Configure base API URL: supports VITE_API_BASE_URL env variable or defaults to relative '/api'
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_PREFIX = BASE_URL ? `${BASE_URL}/api` : '/api';

/**
 * Storage key for user JWT token
 */
const TOKEN_KEY = 'mindtext_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Custom Error class that retains the HTTP status code and server error details.
 */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Generic fetch wrapper with timeout, JSON parsing, and unified error handling.
 * Automatically injects the Authorization Bearer header if a token is present.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_PREFIX}${endpoint}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      if (!isJson && response.status >= 500) {
        throw new ApiError(
          `Server error (${response.status}): The backend service is currently unavailable or returned an unexpected error.`,
          response.status
        );
      }
      const serverMessage = data?.error || data?.message || response.statusText;
      throw new ApiError(serverMessage || `Request failed with status ${response.status}`, response.status);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network / offline error
    throw new ApiError(
      'Unable to connect to the backend server. Please ensure the Python Flask API is running at http://127.0.0.1:5000.'
    );
  }
}

// -------------------------------------------------------------
// AUTHENTICATION APIs
// -------------------------------------------------------------

export async function registerUser(payload: {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
}): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token) {
    setStoredToken(res.token);
  }
  return res;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token) {
    setStoredToken(res.token);
  }
  return res;
}

export async function getCurrentUser(): Promise<User> {
  const res = await request<{ success: boolean; user: User }>('/auth/me');
  return res.user;
}

export async function updateUserProfile(payload: {
  full_name?: string;
  new_password?: string;
  current_password?: string;
}): Promise<User> {
  const res = await request<{ success: boolean; user: User }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.user;
}

export function logoutUser(): void {
  setStoredToken(null);
}

// -------------------------------------------------------------
// PREDICTION & ANALYTICS APIs
// -------------------------------------------------------------

export async function getBackendHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

export async function predictSentiment(text: string): Promise<PredictionData> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ApiError('Text input cannot be empty.');
  }

  const response = await request<PredictResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify({ text: trimmed }),
  });

  if (!response.success || !response.data) {
    throw new ApiError(response.error || 'Prediction failed without return data.');
  }

  return response.data;
}

export async function getHistory(params?: {
  limit?: number;
  offset?: number;
  sentiment?: string;
}): Promise<HistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params?.offset !== undefined) searchParams.append('offset', params.offset.toString());
  if (params?.sentiment) searchParams.append('sentiment', params.sentiment);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request<HistoryResponse>(`/history${query}`);
}

export async function deleteHistoryItem(id: number): Promise<DeleteResponse> {
  return request<DeleteResponse>(`/history/${id}`, {
    method: 'DELETE',
  });
}

export async function clearAllHistory(): Promise<DeleteResponse> {
  return request<DeleteResponse>(`/history`, {
    method: 'DELETE',
  });
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const res = await request<AnalyticsResponse>('/analytics');
  if (!res.success || !res.data) {
    throw new ApiError(res.error || 'Failed to retrieve analytics data.');
  }
  return res.data;
}

export async function getModelInfo(): Promise<ModelMetadata> {
  const res = await request<ModelInfoResponse>('/model-info');
  if (!res.success || !res.data) {
    throw new ApiError(res.error || 'Failed to retrieve model performance info.');
  }
  return res.data;
}
