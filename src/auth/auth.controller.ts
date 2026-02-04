import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { RequestWithUser } from './types/request-with-user';
import {
  LoginBodySchema,
  LoginResponse,
  LoginResponseSchema,
} from 'schemaValidations/auth.schema';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const body = LoginBodySchema.parse(request.body);
    await this.authService.login(body, response);

    return LoginResponseSchema.parse({ success: true });
  }

  @Post('refresh')
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    return this.authService.refresh(refreshToken, response);
  }

  @Post('logout')
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(request, response);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  logoutAll(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logoutAll(request.user.sub, response);
  }
}
