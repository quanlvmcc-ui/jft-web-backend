import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { ExamHistoryDto } from './dto/exam-history.dto';

/** TTL cho cache user profile: 5 phút (đơn vị ms theo cache-manager v7/Keyv) */
const USER_PROFILE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /** Key quy ước: "user:{id}:profile" — dễ trace trên Redis CLI / RedisInsight */
  private userProfileKey(userId: string): string {
    return `user:${userId}:profile`;
  }

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const cacheKey = this.userProfileKey(userId);

    // ------- 1. Cache HIT: trả ngay, không chạm DB -------
    const cached = await this.cache.get<UserProfileDto>(cacheKey);
    if (cached) return cached;

    // ------- 2. Cache MISS: truy vấn PostgreSQL ----------
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        phoneNumber: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException(`User not found!`);

    // ------- 3. Ghi vào cache với TTL 5 phút -------------
    // Sau 5 phút Redis tự xóa key, request tiếp theo sẽ refresh từ DB
    await this.cache.set(cacheKey, user, USER_PROFILE_TTL_MS);

    return user;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) throw new NotFoundException(`User not found!`);

    // update user
    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        phoneNumber: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // ------- Invalidate cache -------
    // Profile đã thay đổi → xóa cache key
    // Request GET /me tiếp theo sẽ chạy lại DB query và cache lại dữ liệu mới
    await this.cache.del(this.userProfileKey(userId));

    return updatedUser;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) throw new NotFoundException(`User not found!`);

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid)
      throw new UnauthorizedException('Old password is incorrect');

    if (oldPassword === newPassword) {
      throw new BadRequestException(
        `Old password and new password is the same!`,
      );
    }

    // update trong DB
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: newHashedPassword,
      },
    });
    return {
      message: 'Password changed successfully',
    };
  }

  async getExamHistory(userId: string): Promise<ExamHistoryDto[]> {
    const examSessions = await this.prisma.examSession.findMany({
      where: {
        userId: userId,
        status: 'SUBMITTED',
        submittedAt: { not: null },
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // transform data
    const examHistory = examSessions.map((examSession) => {
      const {
        id,
        exam,
        totalCorrect,
        totalWrong,
        totalUnanswered,
        submittedAt,
        startTime,
      } = examSession;

      const totalQuestions =
        (totalCorrect ?? 0) + (totalWrong ?? 0) + (totalUnanswered ?? 0);
      const correctAnswers = totalCorrect ?? 0;
      const percentage =
        totalQuestions > 0
          ? Math.round(((correctAnswers / totalQuestions) * 100 * 100) / 100)
          : 0;
      const timeTaken = Math.floor(
        (submittedAt!.getTime() - startTime.getTime()) / 1000,
      );

      return {
        id,
        examId: exam.id,
        examTitle: exam.title,
        score: correctAnswers,
        totalQuestions,
        correctAnswers,
        percentage,
        submittedAt: submittedAt!,
        timeTaken,
      };
    });

    return examHistory;
  }
}
