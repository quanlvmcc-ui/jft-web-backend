import { CookieOptions } from 'express';

// Cookie configuration
// Production (Netlify to Render): use lax (safer than none)
// Development (localhost): use lax
export const baseAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS in prod
  sameSite: 'lax', // Consistent across all environments
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
