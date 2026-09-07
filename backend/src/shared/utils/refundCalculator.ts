export type RefundPercentage = 0 | 50 | 100;

export function calculateRefund(startsAt: Date, now: Date, creditsDeducted: number) {
  const hoursUntilStart = (startsAt.getTime() - now.getTime()) / 3_600_000;
  const refundPercentage: RefundPercentage =
    hoursUntilStart >= 24 ? 100 : hoursUntilStart >= 2 ? 50 : 0;

  return {
    refundPercentage,
    refundedCredits: Math.floor((creditsDeducted * refundPercentage) / 100),
  };
}
