import { CookieOptions } from 'express';

// Cookie configuration for custom domain
// Production: sameSite=none, secure=true, domain=.dichvumarketing.site
// Development: sameSite=lax, secure=false
export const baseAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  ...(process.env.NODE_ENV === 'production' && {
    domain: '.dichvumarketing.site',
  }),
};

export const accessTokenCookieOptions: CookieOptions = {
  ...baseAuthCookieOptions,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

export const refreshTokenCookieOptions = (expiresAt: Date): CookieOptions => ({
  ...baseAuthCookieOptions,
  expires: expiresAt,
});
