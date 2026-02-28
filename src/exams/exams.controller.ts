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
import { Throttle } from '@nestjs/throttler';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '../auth/enum/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestWithUser } from '../auth/types/request-with-user';
import { CreateExamDto } from './dto/create-exam.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { ApproveExamAccessDto } from './dto/approve-exam-access.dto';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getExams(@Req() request: RequestWithUser) {
    return this.examsService.getExamsForUser(request.user.sub);
  }

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

  @Post(':id/access/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  approveExamAccess(
    @Param('id') examId: string,
    @Body() approveExamAccessDto: ApproveExamAccessDto,
  ) {
    return this.examsService.approveExamAccess(
      examId,
      approveExamAccessDto.userId,
    );
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @Throttle({ default: { limit: 180, ttl: 60000 } })
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
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  startExamSession(
    @Req() request: RequestWithUser,
    @Param('id') examId: string,
  ) {
    return this.examsService.startSession(request.user.sub, examId);
  }

  @Get(':id/sessions/:sessionId/result')
  @UseGuards(JwtAuthGuard)
  getExamSessionResult(
    @Req() request: RequestWithUser,
    @Param('id') examId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.examsService.getExamSessionResult(
      request.user.sub,
      examId,
      sessionId,
    );
  }

  @Get(':id/sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  getExamSessionDetail(
    @Req() request: RequestWithUser,
    @Param('id') examId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.examsService.getExamSessionDetail(
      request.user.sub,
      examId,
      sessionId,
    );
  }

  @Get(':id')
  getPublishedExams(@Param('id') examId: string) {
    return this.examsService.getPublishedExams(examId);
  }
}
