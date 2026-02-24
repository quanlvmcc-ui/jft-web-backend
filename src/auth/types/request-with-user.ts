import type { Request } from 'express';
import { Role } from '../enum/role.enum';

export interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: Role;
  };
  cookies: Record<string, any>;
}
