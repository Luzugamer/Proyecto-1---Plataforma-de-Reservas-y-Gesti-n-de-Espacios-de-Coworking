export interface EstimatedRefund {
  percentage: 100 | 50 | 0;
  refundedCredits: number;
  tier: 'EARLY' | 'LATE' | 'CRITICAL';
  tierLabel: string;
  hoursRemaining: number;
}

/**
 * Calcula el porcentaje y créditos a reembolsar según la regla de negocio RN-CAN:
 * - Cancelación Temprana (> 24 horas antes): 100% reembolso
 * - Cancelación Tardía (entre 24h y 2 horas antes): 50% reembolso
 * - Cancelación Crítica (< 2 horas antes o posterior al inicio): 0% reembolso
 */
export function calculateEstimatedRefund(
  startsAtIso: string,
  creditsDeducted: number,
  currentTimestamp: number = Date.now()
): EstimatedRefund {
  const startTime = Date.parse(startsAtIso);
  const diffMs = startTime - currentTimestamp;
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (hoursRemaining > 24) {
    return {
      percentage: 100,
      refundedCredits: creditsDeducted,
      tier: 'EARLY',
      tierLabel: 'Cancelación Temprana (>24h de anticipación)',
      hoursRemaining,
    };
  }

  if (hoursRemaining >= 2) {
    return {
      percentage: 50,
      refundedCredits: Math.floor(creditsDeducted * 0.5),
      tier: 'LATE',
      tierLabel: 'Cancelación Tardía (entre 24h y 2h de anticipación)',
      hoursRemaining,
    };
  }

  return {
    percentage: 0,
    refundedCredits: 0,
    tier: 'CRITICAL',
    tierLabel: 'Cancelación Crítica (<2h de anticipación)',
    hoursRemaining,
  };
}

export interface CheckinWindowStatus {
  isWithinWindow: boolean;
  isTooEarly: boolean;
  isTooLate: boolean;
  minutesUntilStart: number;
}

/**
 * Evalúa si el momento actual está dentro de la ventana de check-in (RN-CHK: ±15 min)
 */
export function getCheckinWindowStatus(
  startsAtIso: string,
  currentTimestamp: number = Date.now()
): CheckinWindowStatus {
  const startTime = Date.parse(startsAtIso);
  const diffMinutes = (startTime - currentTimestamp) / (1000 * 60);

  // Ventana: desde 15 min antes (diffMinutes <= 15) hasta 15 min después (diffMinutes >= -15)
  const isWithinWindow = diffMinutes <= 15 && diffMinutes >= -15;
  const isTooEarly = diffMinutes > 15;
  const isTooLate = diffMinutes < -15;

  return {
    isWithinWindow,
    isTooEarly,
    isTooLate,
    minutesUntilStart: Math.round(diffMinutes),
  };
}
