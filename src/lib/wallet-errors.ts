import type { ApiError } from '@/types';

/** Pesan untuk kode error PIN/OTP dari payment-service (D14/D19). */
const WALLET_ERROR_MESSAGES: Record<string, string> = {
  WALLET_PIN_FORMAT: 'Your PIN must be exactly 6 digits.',
  WALLET_PIN_INVALID: 'Incorrect PIN. Attempts left: {n}.',
  WALLET_PIN_LOCKED: 'Your PIN is locked after too many wrong attempts. Try again later or reset your PIN.',
  WALLET_PIN_NOT_SET: 'Create your wallet PIN first.',
  WALLET_PIN_REQUIRED: 'Enter your wallet PIN.',
  WALLET_SPEND_BLOCKED: 'Payments and withdrawals are on hold for 24 hours after a PIN reset.',
  WALLET_OTP_REQUIRED: 'Enter the verification code from your email.',
  WALLET_OTP_COOLDOWN: 'Please wait a moment before requesting a new code.',
  WALLET_OTP_RATE_LIMIT: 'Too many code requests. Please try again later.',
  WALLET_OTP_INVALID: 'Incorrect verification code.',
  WALLET_OTP_EXPIRED: 'The verification code has expired. Request a new one.',
  WALLET_OTP_USED: 'This verification code was already used. Request a new one.',
  WALLET_OTP_TOO_MANY_ATTEMPTS: 'Too many attempts. Request a new code.',
  WALLET_OTP_PAYLOAD_MISMATCH: 'The account details changed after the code was sent. Request a new code.',
  WALLET_OTP_SEND_FAILED: 'We could not send the verification email. Please try again.',
};

export function walletErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as Partial<ApiError> | undefined;
  const template = apiError?.code ? WALLET_ERROR_MESSAGES[apiError.code] : undefined;
  if (template) {
    return template.replace('{n}', String(apiError?.remainingAttempts ?? 0));
  }
  return apiError?.message || fallback;
}

/** OTP salah/kedaluwarsa/terpakai → kode harus diminta ulang. */
export function isOtpError(error: unknown): boolean {
  return Boolean((error as Partial<ApiError> | undefined)?.code?.startsWith('WALLET_OTP_'));
}
