import { z } from 'zod';

/* ======================================================
 * LOGIN
 * ====================================================== */

/**
 * FE gửi email + password
 * Backend:
 *  - validate
 *  - set HttpOnly cookie (optional implementation)
 *  - KHÔNG trả token (or may return tokens depending on flow)
 */
export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

/**
 * Login thành công hay không
 * FE không cần biết token
 */
export const LoginResponseSchema = z.object({
  success: z.literal(true),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/* ======================================================
 * USER / ME
 * ====================================================== */

/**
 * Thông tin user FE cần để:
 *  - hiển thị
 *  - guard route
 *  - check role
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
});
export type User = z.infer<typeof UserSchema>;

/**
 * GET /me
 * Nếu cookie hợp lệ → trả user
 * Nếu không → 401
 */
export const MeResponseSchema = UserSchema;
export type MeResponse = z.infer<typeof MeResponseSchema>;

/* ======================================================
 * LOGOUT
 * ====================================================== */

/**
 * Backend clear cookie
 * FE chỉ cần biết logout OK
 */
export const LogoutResponseSchema = z.object({
  success: z.literal(true),
});
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
