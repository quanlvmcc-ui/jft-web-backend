import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { RequestWithUser } from 'src/auth/types/request-with-user';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enum/role.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() request: RequestWithUser) {
    return request.user;
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAdminData() {
    return { message: 'This is admin data' };
  }
}
