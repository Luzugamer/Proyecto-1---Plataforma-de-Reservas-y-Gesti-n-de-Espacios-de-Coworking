import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';
import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useForgotPassword() {
  return useMutation<ForgotPasswordResponse, AppApiError, ForgotPasswordRequest>({
    mutationFn: (data) => authApi.forgotPassword(data),
  });
}

export function useResetPassword() {
  return useMutation<ResetPasswordResponse, AppApiError, ResetPasswordRequest>({
    mutationFn: (data) => authApi.resetPassword(data),
  });
}
