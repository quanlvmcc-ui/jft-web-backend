import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { ExamHistoryDto } from './dto/exam-history.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
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
