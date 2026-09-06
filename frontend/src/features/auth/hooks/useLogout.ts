import { useMutation } from '@tanstack/react-query';
import { useAuthContext } from '@/app/AuthProvider';

export function useLogout() {
  const { logout } = useAuthContext();

  return useMutation<void, Error, void>({
    mutationFn: () => logout(),
  });
}
