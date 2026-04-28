import axios, { AxiosError, AxiosHeaders, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import appEnv from '../config/env';

const DEFAULT_TIMEOUT = 15000;
const AUTH_TOKEN_KEY = 'auth_token';

export interface RequestError extends Error {
  code?: number | string;
  response?: AxiosResponse;
  raw?: unknown;
}

interface ApiEnvelope<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

function getStoredToken(): string {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAuthToken(token: string): void {
  try {
    if (!token) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Ignore storage failures.
  }
}

export function clearAuthToken(): void {
  setAuthToken('');
}

const service: AxiosInstance = axios.create({
  baseURL: appEnv.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();

    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('X-Requested-With', 'XMLHttpRequest');
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    } else {
      config.headers = AxiosHeaders.from({
        ...(config.headers && typeof config.headers === 'object' ? (config.headers as Record<string, string>) : {}),
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });
    }

    if (import.meta.env.DEV) {
      console.info('[request]', {
        method: config.method,
        url: `${config.baseURL ?? ''}${config.url ?? ''}`,
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

service.interceptors.response.use(
  <T>(response: AxiosResponse<ApiEnvelope<T> | T>) => {
    const { data } = response;

    if (import.meta.env.DEV) {
      console.info('[response]', {
        status: response.status,
        url: response.config?.url,
        data,
      });
    }

    if (data && typeof data === 'object' && 'code' in (data as ApiEnvelope<T>)) {
      const { code, message } = data as ApiEnvelope<T>;

      if (code !== 0 && code !== 200) {
        const businessError: RequestError = new Error(message || '请求失败');
        businessError.name = 'BusinessError';
        businessError.code = code;
        businessError.response = response;
        return Promise.reject(businessError);
      }

      return 'data' in (data as ApiEnvelope<T>) ? ((data as ApiEnvelope<T>).data as T) : (data as T);
    }

    return data as T;
  },
  (error: AxiosError) => {
    const { response, code, message } = error;

    if (response?.status === 401) {
      clearAuthToken();
      console.error('[response] unauthorized, token cleared');
    }

    let normalizedMessage = message || '网络异常，请稍后重试';

    if (code === 'ECONNABORTED') {
      normalizedMessage = '请求超时，请稍后重试';
    } else if (response?.status === 403) {
      normalizedMessage = '暂无权限执行该操作';
    } else if (response?.status === 404) {
      normalizedMessage = '请求资源不存在';
    } else if ((response?.status || 0) >= 500) {
      normalizedMessage = '服务异常，请联系管理员';
    }

    const normalizedError: RequestError = new Error(normalizedMessage);
    normalizedError.name = error.name || 'RequestError';
    normalizedError.code = response?.status || code;
    normalizedError.response = response;
    normalizedError.raw = error;

    if (import.meta.env.DEV) {
      console.error('[response error]', normalizedError);
    }

    return Promise.reject(normalizedError);
  },
);

interface RequestFn {
  <T = unknown>(config: Parameters<AxiosInstance['request']>[0]): Promise<T>;
}

const request = service.request.bind(service) as RequestFn;

export default request;
