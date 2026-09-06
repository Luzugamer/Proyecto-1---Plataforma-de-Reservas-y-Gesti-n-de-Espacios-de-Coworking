import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/shared/types/user';
import { tokenStorage } from '@/shared/api/httpClient';
import { authApi } from '@/features/auth/api';
import { LoginRequest, LoginResponse, RegisterRequest } from '@/features/auth/types';

interface AuthContextType {
  user: User | null;
  role: User['role'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inicialización de sesión al cargar / recargar la app
  const initializeAuth = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      // Intentar refrescar token en memoria silenciosamente
      const refreshRes = await authApi.refresh({ refreshToken });
      tokenStorage.setAccessToken(refreshRes.accessToken);
      tokenStorage.setRefreshToken(refreshRes.refreshToken);

      // Obtener datos del usuario actual
      const userData = await authApi.getMe();
      setUser(userData);
    } catch {
      tokenStorage.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();

    // Escuchar expiración forzada o fallas de sesión en background
    const unsubscribe = tokenStorage.onSessionExpired(() => {
      setUser(null);
    });

    return () => {
      unsubscribe();
    };
  }, [initializeAuth]);

  const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
    const res = await authApi.login(credentials);
    tokenStorage.setAccessToken(res.accessToken);
    tokenStorage.setRefreshToken(res.refreshToken);
    setUser(res.user);
    return res;
  };

  // Auto-login tras el registro según decisión acordada
  const register = async (data: RegisterRequest): Promise<{ user: User }> => {
    await authApi.register(data);
    // Realizar login automático con las credenciales registradas
    const loginRes = await authApi.login({
      email: data.email,
      password: data.password,
    });
    tokenStorage.setAccessToken(loginRes.accessToken);
    tokenStorage.setRefreshToken(loginRes.refreshToken);
    setUser(loginRes.user);
    return { user: loginRes.user };
  };

  const logout = async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout({ refreshToken });
      }
    } catch {
      // Ignorar errores al desloguear en el servidor
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
