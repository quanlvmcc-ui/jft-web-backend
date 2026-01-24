import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { RequestWithUser } from 'src/auth/types/request-with-user';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() request: RequestWithUser) {
    return request.user;
  }
}
