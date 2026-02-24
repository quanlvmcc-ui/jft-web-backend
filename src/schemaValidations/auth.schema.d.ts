import { z } from 'zod';
export declare const LoginBodySchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type LoginBody = z.infer<typeof LoginBodySchema>;
export declare const LoginResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
}, z.core.$strip>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<{
        user: "user";
        admin: "admin";
    }>;
}, z.core.$strip>;
export type User = z.infer<typeof UserSchema>;
export declare const MeResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<{
        user: "user";
        admin: "admin";
    }>;
}, z.core.$strip>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export declare const LogoutResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
}, z.core.$strip>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
