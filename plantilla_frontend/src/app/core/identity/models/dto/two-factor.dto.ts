/**
 * Two-Factor Authentication DTOs
 */

/**
 * Response de estado 2FA (GET /auth/2fa/status)
 */
export interface TwoFactorStatusDto {
  is2faEnabled: boolean;
  twoFactorMethod?: '2fa' | 'sms' | 'whatsapp' | 'telegram';
  phoneNumber?: string;
  twoFactorEnabledAt?: Date | string;
  backupCodesCount?: number;
}
