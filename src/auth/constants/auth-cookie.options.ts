import { CookieOptions } from 'express';

// Cấu hình cookie cho môi trường dev: luôn gửi cookie khi khác port trên localhost
export const baseAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false, // Để false cho localhost, true cho production
  sameSite: 'lax', // Có thể thử 'none' nếu vẫn lỗi, nhưng 'lax' là an toàn cho dev
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
