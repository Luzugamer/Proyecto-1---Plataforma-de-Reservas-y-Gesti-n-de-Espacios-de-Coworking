import { useMutation } from '@tanstack/react-query';
import { useAuthContext } from '@/app/AuthProvider';
import { LoginRequest, LoginResponse } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useLogin() {
  const { login } = useAuthContext();

  return useMutation<LoginResponse, AppApiError, LoginRequest>({
    mutationFn: (credentials) => login(credentials),
  });
}
