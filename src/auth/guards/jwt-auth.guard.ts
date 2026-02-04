import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestWithUser } from '../types/request-with-user';
import { JwtPayload } from '../types/jwt-payload';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const token = request.cookies?.access_token;
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
