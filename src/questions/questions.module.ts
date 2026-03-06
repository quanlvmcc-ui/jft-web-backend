import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Questions Module
 *
 * NHIỆM VỤ:
 * - Quản lý CRUD operations cho Question Bank
 * - Hỗ trợ bulk actions (delete, restore, publish)
 * - Kiểm tra usage của questions trong exams
 *
 * DEPENDENCIES:
 * - AuthModule: JwtAuthGuard, RolesGuard
 * - PrismaService: Database operations (auto-injected globally)
 */
@Module({
  imports: [AuthModule], // Import để sử dụng guards
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService], // Export để ExamsModule có thể dùng
})
export class QuestionsModule {}
