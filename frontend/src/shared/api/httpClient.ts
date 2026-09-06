import { parseErrorResponse, AppApiError } from './errorEnvelope';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:5173/api/v1');

// Almacenamiento seguro en memoria del access token
let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

// Callbacks para eventos globales de sesión
type SessionExpiredCallback = () => void;
const sessionExpiredListeners: Set<SessionExpiredCallback> = new Set();

export const tokenStorage = {
  getAccessToken: () => inMemoryAccessToken,
  setAccessToken: (token: string | null) => {
    inMemoryAccessToken = token;
  },
  getRefreshToken: () => {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem('coworking_refresh_token');
      } catch {
        return inMemoryRefreshToken;
      }
    }
    return inMemoryRefreshToken;
  },
  setRefreshToken: (token: string | null) => {
    inMemoryRefreshToken = token;
    if (typeof localStorage !== 'undefined') {
      try {
        if (token) {
          localStorage.setItem('coworking_refresh_token', token);
        } else {
          localStorage.removeItem('coworking_refresh_token');
        }
      } catch {
        // Ignorar fallas de storage
      }
    }
  },
  clearTokens: () => {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('coworking_refresh_token');
      } catch {
        // Ignorar
      }
    }
  },
  onSessionExpired: (cb: SessionExpiredCallback) => {
    sessionExpiredListeners.add(cb);
    return () => {
      sessionExpiredListeners.delete(cb);
    };
  },
  notifySessionExpired: () => {
    tokenStorage.clearTokens();
    sessionExpiredListeners.forEach((cb) => cb());
  },
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

// Variables para control de concurrencia al refrescar token
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
};

async function executeRefresh(): Promise<string> {
  const currentRefreshToken = tokenStorage.getRefreshToken();
  if (!currentRefreshToken) {
    throw new AppApiError(401, {
      code: 'INVALID_REFRESH_TOKEN',
      message: 'No existe token de renovación disponible.',
    });
  }

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: currentRefreshToken }),
  });

  if (!response.ok) {
    let errorJson: unknown = null;
    try {
      errorJson = await response.json();
    } catch {
      // noop
    }
    const apiError = parseErrorResponse(response.status, errorJson);
    tokenStorage.notifySessionExpired();
    throw apiError;
  }

  const data = (await response.json()) as { accessToken: string; refreshToken: string };
  tokenStorage.setAccessToken(data.accessToken);
  tokenStorage.setRefreshToken(data.refreshToken); // Rotación de token
  return data.accessToken;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = tokenStorage.getAccessToken();
  if (token && !options.skipAuth && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Interceptor para 401 Unauthorized transparente (salvo rutas auth de inicio)
  const isAuthRoute =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/refresh') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/password');

  if (response.status === 401 && !isAuthRoute && !options.skipAuth) {
    if (isRefreshing) {
      try {
        const newToken = await new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });
        headers.set('Authorization', `Bearer ${newToken}`);
        return request<T>(endpoint, { ...options, headers });
      } catch (err) {
        throw err;
      }
    }

    isRefreshing = true;
    try {
      const newToken = await executeRefresh();
      processQueue(null, newToken);
      headers.set('Authorization', `Bearer ${newToken}`);
      return request<T>(endpoint, { ...options, headers });
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let data: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw parseErrorResponse(response.status, data);
  }

  return data as T;
}

export const httpClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
