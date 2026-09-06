import { httpClient } from '@/shared/api/httpClient';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  LogoutRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  MeResponse,
} from './types';

export const authApi = {
  register: (payload: RegisterRequest): Promise<RegisterResponse> =>
    httpClient.post<RegisterResponse>('/auth/register', payload, { skipAuth: true }),

  login: (payload: LoginRequest): Promise<LoginResponse> =>
    httpClient.post<LoginResponse>('/auth/login', payload, { skipAuth: true }),

  refresh: (payload: RefreshRequest): Promise<RefreshResponse> =>
    httpClient.post<RefreshResponse>('/auth/refresh', payload, { skipAuth: true }),

  logout: (payload: LogoutRequest): Promise<void> =>
    httpClient.post<void>('/auth/logout', payload),

  forgotPassword: (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> =>
    httpClient.post<ForgotPasswordResponse>('/auth/password/forgot', payload, { skipAuth: true }),

  resetPassword: (payload: ResetPasswordRequest): Promise<ResetPasswordResponse> =>
    httpClient.post<ResetPasswordResponse>('/auth/password/reset', payload, { skipAuth: true }),

  getMe: (): Promise<MeResponse> => httpClient.get<MeResponse>('/auth/me'),
};
