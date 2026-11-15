import { API_BASE_URL } from './config';
import { ApiResponse, ApiResult, HealthResponse, Reading } from './types';

const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check backend and database connectivity status
 */
export async function getHealth(): Promise<ApiResult<HealthResponse>> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/health`);
    if (!res.ok) {
      return { data: null, error: `Health check failed (HTTP ${res.status})` };
    }
    const json: HealthResponse = await res.json();
    return { data: json, error: null };
  } catch (err: any) {
    const message = err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Network request failed');
    return { data: null, error: message };
  }
}

/**
 * Fetch the latest reading from MongoDB Atlas
 */
export async function getLatestReading(): Promise<ApiResult<Reading>> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/readings/latest`);

    if (res.status === 404) {
      return { data: null, error: null, isEmpty: true };
    }

    if (!res.ok) {
      return { data: null, error: `Server error (HTTP ${res.status})` };
    }

    const json: ApiResponse<Reading> = await res.json();
    return { data: json.data, error: null, isEmpty: false };
  } catch (err: any) {
    const message = err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Network request failed');
    return { data: null, error: message, isEmpty: false };
  }
}

/**
 * Fetch historical readings from MongoDB Atlas
 */
export async function getReadingHistory(options: {
  deviceId?: string;
  limit?: number;
} = {}): Promise<{ data: Reading[]; count: number; error: string | null; isEmpty: boolean }> {
  try {
    const params = new URLSearchParams();
    if (options.deviceId) {
      params.append('deviceId', options.deviceId);
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/readings/history${queryString}`);

    if (!res.ok) {
      return { data: [], count: 0, error: `Server error (HTTP ${res.status})`, isEmpty: false };
    }

    const json: ApiResponse<Reading[]> = await res.json();
    const readings = json.data || [];
    return {
      data: readings,
      count: json.count ?? readings.length,
      error: null,
      isEmpty: readings.length === 0,
    };
  } catch (err: any) {
    const message = err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Network request failed');
    return { data: [], count: 0, error: message, isEmpty: false };
  }
}

/**
 * Formats an ISO timestamp string into human-readable date and time
 */
export function formatTimestamp(timestamp?: string): { date: string; time: string } {
  if (!timestamp) {
    return { date: 'N/A', time: 'N/A' };
  }

  const d = new Date(timestamp);
  if (isNaN(d.getTime())) {
    return { date: 'Invalid date', time: 'N/A' };
  }

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  let dateStr: string;
  if (isToday) {
    dateStr = 'Today';
  } else if (isYesterday) {
    dateStr = 'Yesterday';
  } else {
    dateStr = d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return { date: dateStr, time: timeStr };
}
