import { CookieOptions } from 'express';

// Cookie configuration for custom domain
// Production: sameSite=lax, secure=true, domain=.vjlink-edu.online
// Development: sameSite=lax, secure=false
export const baseAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  ...(process.env.NODE_ENV === 'production' && {
    domain: '.vjlink-edu.online',
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
