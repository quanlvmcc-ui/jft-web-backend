import { CookieOptions } from 'express';

// Cookie configuration for cross-domain requests
// For development (localhost): httpOnly, secure=false, sameSite=lax
// For production (cross-domain): httpOnly, secure=true, sameSite=strict (browser limitation for cross-domain)
const isProduction = process.env.NODE_ENV === 'production';

export const baseAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction, // true for production (HTTPS), false for dev
  sameSite: 'strict', // Use 'strict' for all environments (safest)
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
