import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const SENSITIVE_ERROR_PATTERN = /SQLSTATE|PDOException|QueryException|Stack trace:|Illuminate\\Database|vendor[\\/]laravel|Connection:\s*(?:pgsql|mysql|sqlite)/i;
const SAFE_SERVER_MESSAGE = 'The system could not complete this request. Please try again. If it continues, contact support.';

const safeErrorText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string' || !value.trim() || SENSITIVE_ERROR_PATTERN.test(value)) return fallback;
  return value;
};

const sanitizeErrorPayload = (payload: any, status: number) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const fallback = status >= 500 ? SAFE_SERVER_MESSAGE : 'The request could not be completed. Check the entered information and try again.';
  const errors = source.errors && typeof source.errors === 'object'
    ? Object.fromEntries(Object.entries(source.errors).map(([field, messages]) => [
        field,
        (Array.isArray(messages) ? messages : [messages]).map(message => safeErrorText(message, fallback)),
      ]))
    : undefined;

  return {
    success: false,
    message: status >= 500 ? fallback : safeErrorText(source.message, fallback),
    ...(errors ? { errors } : {}),
    ...(typeof source.error_reference === 'string' ? { error_reference: source.error_reference } : {}),
  };
};

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
  withXSRFToken: true,
});

client.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method?.toLowerCase() === 'get') {
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';
      config.headers['Expires'] = '0';
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Axios returns error bodies as Blob objects for PDF download requests.
    // Decode JSON error blobs before sanitizing them so document failures keep
    // their safe API message and support reference instead of becoming opaque.
    if (error.response?.data instanceof Blob) {
      try {
        const errorText = await error.response.data.text();
        error.response.data = errorText ? JSON.parse(errorText) : {};
      } catch {
        error.response.data = {};
      }
    }

    if (error.response?.status === 401) {
      error.response.data = sanitizeErrorPayload(error.response.data, error.response.status);
      const requestUrl = error.config?.url || '';
      const isAuthCheck = requestUrl.includes('/auth/me') || requestUrl.includes('/login') || requestUrl.includes('/user');

      if (isAuthCheck || !localStorage.getItem('auth_token')) {
        localStorage.removeItem('auth_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.error('[API] Request timed out:', error.config?.url);
      return Promise.reject(new Error('The request timed out. Please try again.'));
    }

    if (!error.response) {
      console.error('[API] Network error - no response received:', error.message);
      return Promise.reject(new Error('Network error - please check your connection and try again.'));
    }

    error.response.data = sanitizeErrorPayload(error.response.data, error.response.status);

    if (error.response.status >= 500) {
      console.error(
        `[API] Server error ${error.response.status}:`,
        error.config?.url,
        error.response.data.error_reference || 'no support reference',
      );
    }

    return Promise.reject(error);
  },
);

export default client;
