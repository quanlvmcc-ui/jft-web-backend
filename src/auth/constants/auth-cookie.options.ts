import { CookieOptions } from 'express';

// Cookie configuration for cross-domain cookie sharing
// sameSite: 'none' requires secure: true + HTTPS + proper CORS
// This works for: Frontend (Netlify) → Backend (Render)
export const baseAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // true in production (HTTPS required)
  sameSite: 'none', // Allow cross-domain cookies
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
