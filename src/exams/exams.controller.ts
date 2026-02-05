import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from 'src/auth/enum/role.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import type { RequestWithUser } from 'src/auth/types/request-with-user';
import { CreateExamDto } from './dto/create-exam.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  createExam(
    @Req() request: RequestWithUser,
    @Body() createExamDto: CreateExamDto,
  ) {
    return this.examsService.createExam(request.user.sub, createExamDto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  publishExam(@Param('id') examId: string) {
    return this.examsService.publishExam(examId);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  submitExam(@Req() request: RequestWithUser, @Param('id') examId: string) {
    return this.examsService.submitExam(request.user.sub, examId);
  }

  /**
   * UC-02: Save Answer (Lưu đáp án tạm thời)
   *
   * Route: PUT /exams/sessions/:sessionId/answers
   * Auth: JwtAuthGuard (any authenticated user)
   * Body: { questionId: string, selectedOptionId: string | null }
   *
   * Flow:
   * 1. Extract userId from JWT (request.user.sub)
   * 2. Extract sessionId from URL params
   * 3. Extract answer data from request body
   * 4. Call service.saveAnswer()
   * 5. Return updated answer
   */
  @Put('sessions/:sessionId/answers')
  @UseGuards(JwtAuthGuard)
  saveAnswer(
    @Req() request: RequestWithUser,
    @Param('sessionId') sessionId: string,
    @Body() saveAnswerDto: SaveAnswerDto,
  ) {
    return this.examsService.saveAnswer(
      request.user.sub,
      sessionId,
      saveAnswerDto,
    );
  }

  @Post(':id/sessions')
  @UseGuards(JwtAuthGuard)
  startExamSession(
    @Req() request: RequestWithUser,
    @Param('id') examId: string,
  ) {
    return this.examsService.startSession(request.user.sub, examId);
  }

  @Get(':id')
  getPublishedExams(@Param('id') examId: string) {
    return this.examsService.getPublishedExams(examId);
  }
}
