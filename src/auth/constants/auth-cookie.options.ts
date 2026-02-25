import { CookieOptions } from 'express';

// Cookie configuration per ChatGPT guidance
// Production: sameSite=none (cross-domain), secure=true
// Development: sameSite=lax (same-site), secure=false
// For Render production: set Domain to .onrender.com to share across subdomains
export const baseAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  ...(process.env.NODE_ENV === 'production' && { domain: '.onrender.com' }),
};

export const accessTokenCookieOptions: CookieOptions = {
  ...baseAuthCookieOptions,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

export const refreshTokenCookieOptions = (expiresAt: Date): CookieOptions => ({
  ...baseAuthCookieOptions,
  expires: expiresAt,
});
