"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutResponseSchema = exports.MeResponseSchema = exports.UserSchema = exports.LoginResponseSchema = exports.LoginBodySchema = void 0;
const zod_1 = require("zod");
exports.LoginBodySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.LoginResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
});
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['user', 'admin']),
});
exports.MeResponseSchema = exports.UserSchema;
exports.LogoutResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
});
//# sourceMappingURL=auth.schema.js.map