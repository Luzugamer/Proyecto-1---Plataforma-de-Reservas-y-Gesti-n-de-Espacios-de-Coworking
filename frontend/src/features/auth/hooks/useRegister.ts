import { useMutation } from '@tanstack/react-query';
import { useAuthContext } from '@/app/AuthProvider';
import { RegisterRequest } from '../types';
import { User } from '@/shared/types/user';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useRegister() {
  const { register } = useAuthContext();

  return useMutation<{ user: User }, AppApiError, RegisterRequest>({
    mutationFn: (data) => register(data),
  });
}
