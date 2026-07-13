// apps/web/src/lib/api.ts
import axios from 'axios';

// Import lazily to avoid circular dependency
let getToken: (() => string | null) | null = null;
let refreshFn: (() => Promise<void>) | null = null;
let logoutFn: (() => void) | null = null;

export function initApiInterceptors(opts: {
  getToken: () => string | null;
  refresh: () => Promise<void>;
  logout: () => void;
}) {
  getToken  = opts.getToken;
  refreshFn = opts.refresh;
  logoutFn  = opts.logout;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken?.();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await refreshFn?.();
          queue.forEach((cb) => cb());
          queue = [];
        } catch {
          logoutFn?.();
          window.location.href = '/login';
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }
      return new Promise((resolve) => {
        queue.push(() => resolve(api(original)));
      });
    }
    return Promise.reject(error);
  }
);