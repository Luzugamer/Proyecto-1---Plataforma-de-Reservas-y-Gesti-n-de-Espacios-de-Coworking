export type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'INVALID_REFRESH_TOKEN'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVALID_OR_EXPIRED_RESET_TOKEN';

export type ErrorCode = AuthErrorCode | string;

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class AppApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, errorData: { code: ErrorCode; message: string; details?: Record<string, unknown> }) {
    super(errorData.message);
    this.name = 'AppApiError';
    this.status = status;
    this.code = errorData.code;
    this.details = errorData.details;
  }
}

export function isAppApiError(error: unknown): error is AppApiError {
  return error instanceof AppApiError;
}

export function parseErrorResponse(status: number, data: unknown): AppApiError {
  if (data && typeof data === 'object' && 'error' in data) {
    const errObj = (data as ApiErrorResponse).error;
    if (errObj && typeof errObj === 'object' && typeof errObj.code === 'string') {
      return new AppApiError(status, {
        code: errObj.code,
        message: errObj.message || 'Ha ocurrido un error en la solicitud',
        details: errObj.details,
      });
    }
  }
  return new AppApiError(status, {
    code: 'UNKNOWN_ERROR',
    message: `Error de servidor (${status})`,
  });
}
