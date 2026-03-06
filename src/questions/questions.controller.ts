import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enum/role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionFilterDto } from './dto/question-filter.dto';
import { BulkActionDto } from './dto/bulk-action.dto';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * 1. GET /questions
   * - List questions với filters, pagination
   * - Query params: page, limit, sectionType, keyword, sort, order
   * - Auth: EDITOR, ADMIN
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  findAll(@Query() filters: QuestionFilterDto) {
    return this.questionsService.findAll(filters);
  }

  /**
   * 2. DELETE /questions/bulk
   * - Xóa nhiều câu hỏi cùng lúc
   * - Body: ids (uuid array)
   * - Auth: EDITOR, ADMIN
   */
  @Delete('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  bulkDelete(@Body() bulkActionDto: BulkActionDto) {
    return this.questionsService.bulkDelete(bulkActionDto);
  }

  /**
   * 3. PATCH /questions/bulk/restore
   * - Khôi phục nhiều câu hỏi đã xóa
   * - Body: ids (uuid array)
   * - Auth: EDITOR, ADMIN
   */
  @Patch('bulk/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  bulkRestore(@Body() bulkActionDto: BulkActionDto) {
    return this.questionsService.bulkRestore(bulkActionDto);
  }

  /**
   * 4. GET /questions/:id
   * - Lấy chi tiết 1 câu hỏi (include options)
   * - Auth: EDITOR, ADMIN
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  /**
   * 5. POST /questions
   * - Tạo câu hỏi mới + options
   * - Body: CreateQuestionDto (title, sectionType, contentHtml, options[])
   * - Auth: EDITOR, ADMIN
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  create(
    @Req() request: RequestWithUser,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionsService.create(createQuestionDto, request.user.sub);
  }

  /**
   * 6. PATCH /questions/:id
   * - Cập nhật câu hỏi + options (xóa rồi tạo lại)
   * - Body: UpdateQuestionDto (all optional - partial update)
   * - Auth: EDITOR, ADMIN
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  update(
    @Param('id') questionId: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(questionId, updateQuestionDto);
  }

  /**
   * 7. DELETE /questions/:id
   * - Soft delete (move to trash, set deletedAt)
   * - Auth: EDITOR, ADMIN
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  softDelete(@Param('id') questionId: string) {
    return this.questionsService.softDelete(questionId);
  }

  /**
   * 8. PATCH /questions/:id/restore
   * - Khôi phục từ trash
   * - Auth: EDITOR, ADMIN
   */
  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  restore(@Param('id') questionId: string) {
    return this.questionsService.restore(questionId);
  }

  /**
   * 9. POST /questions/:id/duplicate
   * - Copy câu hỏi (tạo bản sao với title thêm " (Copy)")
   * - Auth: EDITOR, ADMIN
   */
  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  duplicate(@Param('id') questionId: string, @Req() request: RequestWithUser) {
    return this.questionsService.duplicate(questionId, request.user.sub);
  }

  /**
   * 10. GET /questions/:id/usage
   * - Kiểm tra câu hỏi được dùng trong exam nào
   * - Auth: EDITOR, ADMIN
   */
  @Get(':id/usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  checkUsage(@Param('id') questionId: string) {
    return this.questionsService.checkUsage(questionId);
  }
}
