export interface Reading {
  _id?: string;
  deviceId: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  powerFactor: number;
  frequency?: number;
  timestamp?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

export interface HealthResponse {
  success: boolean;
  service: string;
  status: string;
  database: string;
}

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  isEmpty?: boolean;
}
