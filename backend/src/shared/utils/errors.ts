export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'OUT_OF_OPERATING_HOURS'
  | 'SLOT_UNAVAILABLE'
  | 'HOLD_EXPIRED'
  | 'HOLD_NOT_FOUND'
  | 'INSUFFICIENT_CREDITS'
  | 'RESERVATION_NOT_CANCELLABLE'
  | 'CHECKIN_WINDOW_CLOSED'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_OR_EXPIRED_RESET_TOKEN'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 400,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
