import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { ExamSessionStatus, UserRole } from '@prisma/client';

const EXAM_ACCESS_APPROVED = 'APPROVED';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUserRoleCanTakeExam(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.USER) {
      throw new ForbiddenException('You are not allowed to take exams');
    }
  }

  private getExamAccessClient() {
    const prismaWithAccess = this.prisma as unknown as {
      examAccess: {
        findUnique: (args: unknown) => Promise<{ status: string } | null>;
        upsert: (args: unknown) => Promise<unknown>;
      };
    };

    return prismaWithAccess.examAccess;
  }

  private async ensureExamAccessApproved(userId: string, examId: string) {
    const access = await this.getExamAccessClient().findUnique({
      where: {
        userId_examId: {
          userId,
          examId,
        },
      },
    });

    if (!access || access.status !== EXAM_ACCESS_APPROVED) {
      throw new ForbiddenException('Exam access not approved');
    }
  }

  private async ensureUserCanTakeExam(userId: string, examId: string) {
    await this.ensureUserRoleCanTakeExam(userId);
    await this.ensureExamAccessApproved(userId, examId);
  }

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

  async getExamsForUser(userId: string) {
    // Get all exams where user has APPROVED access and exam is PUBLISHED
    return this.prisma.exam.findMany({
      where: {
        status: 'PUBLISHED',
        accessList: {
          some: {
            userId,
            status: EXAM_ACCESS_APPROVED,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        status: true,
      },
    });
  }

  async approveExamAccess(examId: string, userId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.getExamAccessClient().upsert({
      where: { userId_examId: { userId, examId } },
      update: {
        status: EXAM_ACCESS_APPROVED,
        deletedAt: null,
      },
      create: {
        userId,
        examId,
        status: EXAM_ACCESS_APPROVED,
      },
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

    await this.ensureUserCanTakeExam(userId, examId);

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

    await this.ensureUserCanTakeExam(userId, session.examId);

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

    await this.ensureUserCanTakeExam(userId, examId);

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

  async getExamSessionDetail(
    userId: string,
    examId: string,
    sessionId: string,
  ) {
    // 1) Load session
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: true,
        answers: true,
      },
    });
    // 2) Validate ownership + examId
    // Return 404 if session not found OR doesn't belong to user
    // (Use 404 to prevent leaking info about other users' sessions)
    if (!session || session.userId !== userId || session.examId !== examId) {
      throw new NotFoundException('Session not found');
    }

    // 3) ensureUserCanTakeExam
    await this.ensureUserCanTakeExam(userId, examId);

    // 4) Load exam questions + options
    const questions = await this.prisma.examQuestion.findMany({
      where: {
        examId: session.examId,
        question: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      orderBy: {
        orderNo: 'asc',
      },
      include: {
        question: {
          include: { options: { orderBy: { orderNo: 'asc' } } },
        },
      },
    });

    // 5) Map answers to questions
    const answersByQuestionId = new Map(
      session.answers.map((answer) => [answer.questionId, answer]),
    );

    const mappedQuestions = questions.map((examQuestion) => {
      const answer = answersByQuestionId.get(examQuestion.questionId);

      return {
        questionId: examQuestion.questionId,
        order: examQuestion.orderNo,
        contentHtml: examQuestion.question.contentHtml,
        options: examQuestion.question.options.map((option) => ({
          id: option.id,
          contentHtml: option.contentHtml,
        })),
        selectedOptionId: answer?.selectedOptionId ?? null,
        answeredAt: answer?.answeredAt ?? null,
      };
    });
    // 6) Return response
    return {
      sessionId,
      examId,
      status: session.status,
      startTime: session.startTime,
      timeLimit: session.timeLimit,
      createdAt: session.createdAt,
      submittedAt: session.submittedAt,
      questions: mappedQuestions,
    };
  }

  async getExamSessionResult(
    userId: string,
    examId: string,
    sessionId: string,
  ) {
    // 1) LOAD SESSION - lấy session cùng với tất cả answers
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });

    // 2) VALIDATE OWNERSHIP - session phải tồn tại + thuộc user + thuộc exam đó
    if (!session || session.userId !== userId || session.examId !== examId) {
      throw new NotFoundException('Session not found');
    }

    // 3) VALIDATE STATUS - chỉ xem result khi đã SUBMITTED
    if (session.status !== ExamSessionStatus.SUBMITTED) {
      throw new BadRequestException(
        'Session must be submitted to view results',
      );
    }

    // 4) LOAD QUESTIONS - lấy tất cả câu hỏi + options (kèm isCorrect flag)
    const questions = await this.prisma.examQuestion.findMany({
      where: { examId: session.examId },
      orderBy: { orderNo: 'asc' },
      include: {
        question: {
          include: {
            options: { orderBy: { orderNo: 'asc' } },
          },
        },
      },
    });

    // 5) CREATE MAP - để dễ tìm answer của mỗi câu
    const answersByQuestionId = new Map(
      session.answers.map((answer) => [answer.questionId, answer]),
    );

    // 6) MAP DATA - tạo output kết quả kèm grading info
    const questionResults = questions.map((examQuestion) => {
      const answer = answersByQuestionId.get(examQuestion.questionId);

      return {
        questionId: examQuestion.questionId,
        order: examQuestion.orderNo,
        contentHtml: examQuestion.question.contentHtml,
        selectedOptionId: answer?.selectedOptionId ?? null, // ← Cái user chọn (nhất quán với getExamSessionDetail)
        correctOptionId: answer?.correctOptionId, // ← Đáp án đúng
        isCorrect: answer?.isCorrect, // ← true/false/null
        options: examQuestion.question.options.map((opt) => ({
          id: opt.id,
          contentHtml: opt.contentHtml,
          isCorrect: opt.isCorrect, // ← Highlight đáp án đúng
        })),
      };
    });

    // 7) RETURN - trả về kết quả hoàn chỉnh
    return {
      sessionId,
      examId,
      status: session.status,
      submittedAt: session.submittedAt,
      startTime: session.startTime,
      timeLimit: session.timeLimit,
      totalCorrect: session.totalCorrect,
      totalWrong: session.totalWrong,
      totalUnanswered: session.totalUnanswered,
      questions: questionResults,
    };
  }
}
