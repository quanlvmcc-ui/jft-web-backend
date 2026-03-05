import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RequestWithUser } from '../auth/types/request-with-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enum/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { UploadAvatarResponse } from './dto/upload-avatar.dto';
import { avatarUploadInterceptorOptions } from '../config/multer.config';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAdminData() {
    return { message: 'This is admin data' };
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  getUserProfile(@Req() request: RequestWithUser) {
    return this.usersService.getUserProfile(request.user.sub);
  }

  @Patch('/me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() request: RequestWithUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(request.user.sub, updateProfileDto);
  }

  @Post('/me/change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() request: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      request.user.sub,
      changePasswordDto,
    );
  }

  @Get('/me/exam-history')
  @UseGuards(JwtAuthGuard)
  getExamHistory(@Req() request: RequestWithUser) {
    return this.usersService.getExamHistory(request.user.sub);
  }

  @Post('/me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', avatarUploadInterceptorOptions as any),
  )
  uploadAvatar(
    @Req() request: RequestWithUser,
    @UploadedFile() file: any,
  ): UploadAvatarResponse {
    // Kiểm tra file có tồn tại không
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh để upload');
    }

    // Tạo absolute URL với backend domain
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.get('host') || 'localhost:3000';
    const avatarUrl = `${protocol}://${host}/public/avatars/${file.filename}`;

    // Trả về response
    return {
      avatarUrl,
      filename: file.filename,
      uploadedAt: new Date().toISOString(),
    };
  }
}
