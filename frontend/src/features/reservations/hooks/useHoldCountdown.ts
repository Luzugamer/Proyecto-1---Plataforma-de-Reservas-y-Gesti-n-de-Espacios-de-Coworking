import { useState, useEffect } from 'react';

interface UseHoldCountdownProps {
  expiresAt: string | undefined;
  onExpire?: () => void;
}

export function useHoldCountdown({ expiresAt, onExpire }: UseHoldCountdownProps) {
  const calculateRemainingSeconds = () => {
    if (!expiresAt) return 0;
    const targetTime = Date.parse(expiresAt);
    const now = Date.now();
    return Math.max(0, Math.floor((targetTime - now) / 1000));
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(calculateRemainingSeconds);

  useEffect(() => {
    if (!expiresAt) return;

    // Actualización inicial
    const initialSeconds = calculateRemainingSeconds();
    setRemainingSeconds(initialSeconds);

    if (initialSeconds <= 0) {
      onExpire?.();
      return;
    }

    // Intervalo de 1 segundo que recalcula contra el timestamp absoluto
    const interval = setInterval(() => {
      const secondsLeft = calculateRemainingSeconds();
      setRemainingSeconds(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = remainingSeconds <= 0;
  const isUrgent = remainingSeconds > 0 && remainingSeconds <= 60;

  return {
    remainingSeconds,
    minutes,
    seconds,
    formattedTime,
    isExpired,
    isUrgent,
  };
}
