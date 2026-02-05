import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
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

  async submitExam(userId: string, examId: string) {
    // Step 1: Find existing IN_PROGRESS session

    const session = await this.prisma.examSession.findFirst({
      where: {
        userId,
        examId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: {
          include: {
            question: {
              include: { options: true }, // ← Cần options
            },
          },
        },
        exam: true,
      },
    });

    if (!session) {
      throw new NotFoundException('No active exam session found');
    }

    // Step 1.5: Validate session ownership and status
    if (session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== ExamSessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot submit session with status: ${session.status}`,
      );
    }

    // Step 2: Update session answers and submit in transaction

    return this.prisma.$transaction(async (tx) => {
      let totalCorrect = 0;
      let totalWrong = 0;
      let totalUnanswered = 0;

      // Update each answer
      for (const answer of session.answers) {
        // Get question, find correct option
        const question = answer.question;

        // Calculate isCorrect
        const correctOption = question.options.find(
          (option) => option.isCorrect,
        );

        if (!correctOption) {
          throw new BadRequestException(
            `Question ${question.id} has no correct option defined`,
          );
        }

        if (answer.selectedOptionId === null) {
          totalUnanswered++;
        } else if (answer.selectedOptionId === correctOption.id) {
          totalCorrect++;
        } else {
          totalWrong++;
        }

        // TODO: Create optionsSnapshot
        const optionsSnapshot = question.options.map((option) => ({
          id: option.id,
          contentHtml: option.contentHtml,
          isCorrect: option.isCorrect,
        }));

        // Update answer with grading + snapshots
        await tx.examSessionAnswer.update({
          where: {
            sessionId_questionId: {
              sessionId: session.id,
              questionId: answer.questionId,
            },
          },
          data: {
            isCorrect:
              answer.selectedOptionId === null
                ? null
                : answer.selectedOptionId === correctOption.id,
            questionSnapshotHtml: question.contentHtml,
            optionsSnapshotJson: JSON.stringify(optionsSnapshot),
            correctOptionId: correctOption.id,
          },
        });
      }

      // Mark session as submitted

      return tx.examSession.update({
        where: { id: session.id },
        data: {
          status: ExamSessionStatus.SUBMITTED,
          submittedAt: new Date(),
          totalCorrect,
          totalWrong,
          totalUnanswered,
        },
      });
    });
  }

  /**
   * UC-02: Save Answer (Lưu đáp án tạm thời)
   *
   * Flow:
   * 1. Verify session exists and belongs to userId
   * 2. Verify session status is IN_PROGRESS
   * 3. Verify question belongs to this exam
   * 4. Update ExamSessionAnswer using composite key (sessionId, questionId)
   * 5. Return updated answer
   *
   * Composite key update syntax:
   * where: { sessionId_questionId: { sessionId: "...", questionId: "..." } }
   */
  async saveAnswer(
    userId: string,
    sessionId: string,
    saveAnswerDto: SaveAnswerDto,
  ) {
    // Step 1: Verify session exists and belongs to user (ownership validation)
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true },
    });

    // Return 404 if session not found OR doesn't belong to user
    // (Use 404 to prevent leaking info about other users' sessions)
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    // Step 2: Verify session is IN_PROGRESS (cannot save answer if submitted/completed)
    if (session.status !== ExamSessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot save answer for session with status: ${session.status}`,
      );
    }

    // Step 3: Verify question belongs to this exam
    // This ensures guest cannot submit answer for questions from other exams
    const question = await this.prisma.examQuestion.findFirst({
      where: {
        questionId: saveAnswerDto.questionId, // ← Use questionId field from ExamQuestion
        examId: session.examId,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found in this exam');
    }

    // Step 4: Update answer using composite unique key (sessionId, questionId)
    // Use update() instead of updateMany() because we have a unique constraint
    const updatedAnswer = await this.prisma.examSessionAnswer.update({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: saveAnswerDto.questionId,
        },
      },
      data: {
        selectedOptionId: saveAnswerDto.selectedOptionId,
        answeredAt: new Date(),
      },
    });

    return updatedAnswer;
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
          data: exam.questions.map((examQuestion) => ({
            sessionId: session.id,
            questionId: examQuestion.questionId, // ← Use questionId from ExamQuestion
            selectedOptionId: null,
          })),
        });
      }

      return session;
    });

    return newSession;
  }
}
