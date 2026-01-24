import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestWithUser } from './types/request-with-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    // Implement JWT validation logic here
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const authHeader = request.headers.authorization;
    // const authHeader = (request.headers &&
    //   (request.headers.authorization || request.headers['authorization'])) as
    //   | string
    //   | undefined;
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    try {
      const payload = this.jwtService.verify(token);
      // You can attach the payload to the request object if needed
      (request as any).user = payload;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}
