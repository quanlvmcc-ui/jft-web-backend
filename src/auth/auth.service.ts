import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { generateRefreshToken } from './utils/refresh-token.util';
import { LoginBody } from '../schemaValidations/auth.schema';
import { Request, Response } from 'express';
import {
  accessTokenCookieOptions,
  baseAuthCookieOptions,
  refreshTokenCookieOptions,
} from './constants/auth-cookie.options';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // 2.Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3.Tạo user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    return user;
  }

  async login(body: LoginBody, response: Response): Promise<void> {
    const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL);

    // xác thực người dùng
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(body.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // tạo access token
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' },
    );

    // tạo refresh token
    const refreshToken = generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    // set cookie
    console.log('🔐 Setting cookies:', {
      NODE_ENV: process.env.NODE_ENV,
      accessTokenCookieOptions,
      refreshTokenCookieOptions: refreshTokenCookieOptions(
        refreshTokenExpiresAt,
      ),
    });

    response.cookie('access_token', accessToken, accessTokenCookieOptions);

    response.cookie(
      'refresh_token',
      refreshToken,
      refreshTokenCookieOptions(refreshTokenExpiresAt),
    );
  }

  async refresh(refreshToken: string, response: Response) {
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expire refresh token');
    }
    const { user } = tokenRecord;

    // 1️⃣ XÓA refresh token CŨ (revoke)
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // 2️⃣ TẠO refresh token MỚI
    const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;
    const newRefreshToken = generateRefreshToken();
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL);

    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: newExpiresAt,
      },
    });

    // cấp access token mới
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' },
    );

    // set cookie

    response.cookie('access_token', accessToken, accessTokenCookieOptions);
    response.cookie(
      'refresh_token',
      newRefreshToken,
      refreshTokenCookieOptions(newExpiresAt),
    );
    return { message: 'Access token refreshed successfully' };
  }

  async logout(request: Request, response: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshToken = request.cookies?.refresh_token;

    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: { token: refreshToken },
      });
    }
    response.clearCookie('access_token', baseAuthCookieOptions);
    response.clearCookie('refresh_token', baseAuthCookieOptions);
    return {
      message: 'Logged out successfully',
    };
  }

  async logoutAll(userId: string, response: Response) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    response.clearCookie('access_token', baseAuthCookieOptions);
    response.clearCookie('refresh_token', baseAuthCookieOptions);

    return {
      success: true,
      message: 'Logged out from all devices successfully',
    };
  }
}
