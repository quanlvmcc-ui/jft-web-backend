import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { ExamSessionStatus } from '@prisma/client';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  createExam(creatorId: string, createExamDto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        ...createExamDto,
        createdBy: creatorId,
        status: 'DRAFT',
      },
    });
  }

  publishExam(examId: string) {
    return this.prisma.exam.update({
      where: { id: examId },
      data: { status: 'PUBLISHED' },
    });
  }

  async submitExam(
    userId: string,
    examId: string,
    submitExamDto: SubmitExamDto,
  ) {
    // Step 1: Find existing IN_PROGRESS session

    const session = await this.prisma.examSession.findFirst({
      where: {
        userId,
        examId,
        status: ExamSessionStatus.IN_PROGRESS,
      },
    });

    if (!session) {
      throw new NotFoundException('No active exam session found');
    }

    // Step 2: Update session answers and submit in transaction

    return this.prisma.$transaction(async (tx) => {
      // Update each answer
      for (const answer of submitExamDto.answers) {
        await tx.examSessionAnswer.updateMany({
          where: {
            sessionId: session.id,
            questionId: answer.questionId,
          },
          data: {
            selectedOptionId: answer.selectedOptionId,
          },
        });
      }

      // Mark session as submitted

      return tx.examSession.update({
        where: { id: session.id },
        data: {
          status: ExamSessionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });
    });
  }

  getPublishedExams(examId: string) {
    return this.prisma.exam.findFirst({
      where: { id: examId, status: 'PUBLISHED' },
    });
  }

  async startSession(userId: string, examId: string) {
    // Step 1: Check exam exists and is PUBLISHED

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    if (exam.status !== 'PUBLISHED') {
      throw new BadRequestException('Exam is not published');
    }

    // Step 2: Check if user already has IN_PROGRESS session for this exam

    const existingSession = await this.prisma.examSession.findFirst({
      where: {
        userId,
        examId,
        status: ExamSessionStatus.IN_PROGRESS,
      },
      include: { answers: true },
    });

    if (existingSession) {
      return existingSession;
    }

    // Step 3: Create new session with all exam_session_answers in transaction

    const newSession = await this.prisma.$transaction(async (tx) => {
      // Create exam session

      const session = await tx.examSession.create({
        data: {
          userId,
          examId,
          status: ExamSessionStatus.IN_PROGRESS,
          startTime: new Date(),
          timeLimit: exam.timeLimit || 3600,
        },
      });

      // Bulk create exam_session_answers for all questions
      if (exam.questions.length > 0) {
        await tx.examSessionAnswer.createMany({
          data: exam.questions.map((question) => ({
            sessionId: session.id,
            questionId: question.id,
            selectedOptionId: null,
          })),
        });
      }

      return session;
    });

    return newSession;
  }
}
