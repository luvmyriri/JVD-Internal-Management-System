import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30-second request timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
  withXSRFToken: true,
});

// Request interceptor — attach auth token & fix FormData uploads
client.interceptors.request.use(
  (config) => {
    // Prevent browser/tunnel caching on GET requests
    if (config.method?.toLowerCase() === 'get') {
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';
      config.headers['Expires'] = '0';
    }

    // When sending FormData, let the browser/axios auto-set multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — comprehensive error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized — clear session and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Request timeout (axios ECONNABORTED or code ETIMEDOUT)
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.error('[API] Request timed out:', error.config?.url);
      return Promise.reject(new Error('The request timed out. Please try again.'));
    }

    // Network error — no response received (server down, offline, CORS failure)
    if (!error.response) {
      console.error('[API] Network error — no response received:', error.message);
      return Promise.reject(new Error('Network error — please check your connection and try again.'));
    }

    // 5xx Server errors
    if (error.response.status >= 500) {
      console.error(
        `[API] Server error ${error.response.status}:`,
        error.config?.url,
        error.response.data
      );
      return Promise.reject(
        new Error(
          error.response.data?.message ||
          `Server error (${error.response.status}). Please try again or contact support.`
        )
      );
    }

    // All other errors (4xx etc.) — pass through as-is so callers can handle them
    return Promise.reject(error);
  }
);

export default client;

