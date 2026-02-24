import { CookieOptions } from 'express';

// Cấu hình cookie cho môi trường dev: luôn gửi cookie khi khác port trên localhost
// Cho production (cross-origin): secure=true, sameSite=none
// Cho development (localhost): secure=false, sameSite=lax
const isProduction = process.env.NODE_ENV === 'production';

export const baseAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction, // true cho production (HTTPS), false cho dev
  sameSite: isProduction ? 'none' : 'lax', // 'none' cho cross-origin production, 'lax' cho dev
  path: '/',
};

export const accessTokenCookieOptions: CookieOptions = {
  ...baseAuthCookieOptions,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

export const refreshTokenCookieOptions = (expiresAt: Date): CookieOptions => ({
  ...baseAuthCookieOptions,
  expires: expiresAt,
});
