import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamSessionStatus } from '@prisma/client';

describe('ExamsService', () => {
  let service: ExamsService;
  let prisma: PrismaService;

  const mockUserId = 'test-user-123';
  const mockExamId = 'exam-123';

  const mockExam = {
    id: mockExamId,
    title: 'English Test',
    description: 'Basic English Test',
    status: 'PUBLISHED',
    createdBy: 'admin-123',
    timeLimit: 3600,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    questions: [
      { id: 'q1', sectionType: 'LISTENING' },
      { id: 'q2', sectionType: 'READING' },
    ],
  };

  const mockExamSession = {
    id: 'session-123',
    userId: mockUserId,
    examId: mockExamId,
    status: ExamSessionStatus.IN_PROGRESS,
    startTime: new Date(),
    timeLimit: 3600,
    submittedAt: null,
    deletedAt: null,
    totalCorrect: null,
    totalWrong: null,
    totalUnanswered: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        {
          provide: PrismaService,
          useValue: {
            exam: {
              create: jest.fn(),
              update: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
            examSession: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            examSessionAnswer: {
              createMany: jest.fn(),
              updateMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('startSession (UC-01)', () => {
    describe('Success Scenarios', () => {
      it('should create new exam session with answers when none exists', async () => {
        jest
          .spyOn(prisma.exam, 'findUnique')
          .mockResolvedValue(mockExam as any);
        jest.spyOn(prisma.examSession, 'findFirst').mockResolvedValue(null);

        const transactionMock = jest.fn(async (callback) => {
          const tx = {
            examSession: {
              create: jest.fn().mockResolvedValue(mockExamSession),
            },
            examSessionAnswer: {
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
          };
          return callback(tx);
        });

        jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

        const result = await service.startSession(mockUserId, mockExamId);

        expect(result).toEqual(mockExamSession);
        expect(prisma.exam.findUnique).toHaveBeenCalledWith({
          where: { id: mockExamId },
          include: { questions: true },
        });
        expect(prisma.examSession.findFirst).toHaveBeenCalledWith({
          where: {
            userId: mockUserId,
            examId: mockExamId,
            status: ExamSessionStatus.IN_PROGRESS,
          },
          include: { answers: true },
        });
      });

      it('should resume existing IN_PROGRESS session', async () => {
        jest
          .spyOn(prisma.exam, 'findUnique')
          .mockResolvedValue(mockExam as any);
        jest
          .spyOn(prisma.examSession, 'findFirst')
          .mockResolvedValue(mockExamSession as any);

        const result = await service.startSession(mockUserId, mockExamId);

        expect(result).toEqual(mockExamSession);
        expect(prisma.examSession.findFirst).toHaveBeenCalled();
      });

      it('should create ExamSessionAnswers for all questions', async () => {
        jest
          .spyOn(prisma.exam, 'findUnique')
          .mockResolvedValue(mockExam as any);
        jest.spyOn(prisma.examSession, 'findFirst').mockResolvedValue(null);

        const mockAnswersCreated = [
          { id: 'a1', questionId: 'q1', sessionId: 'session-123' },
          { id: 'a2', questionId: 'q2', sessionId: 'session-123' },
        ];

        const transactionMock = jest.fn(async (callback) => {
          const tx = {
            examSession: {
              create: jest.fn().mockResolvedValue(mockExamSession),
            },
            examSessionAnswer: {
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
          };
          const result = await callback(tx);
          expect(tx.examSessionAnswer.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
              expect.objectContaining({
                questionId: 'q1',
                selectedOptionId: null,
              }),
              expect.objectContaining({
                questionId: 'q2',
                selectedOptionId: null,
              }),
            ]),
          });
          return result;
        });

        jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

        await service.startSession(mockUserId, mockExamId);

        expect(transactionMock).toHaveBeenCalled();
      });

      it('should use default timeLimit of 3600 when not specified', async () => {
        const examWithoutTimeLimit = { ...mockExam, timeLimit: null };
        jest
          .spyOn(prisma.exam, 'findUnique')
          .mockResolvedValue(examWithoutTimeLimit as any);
        jest.spyOn(prisma.examSession, 'findFirst').mockResolvedValue(null);

        const transactionMock = jest.fn(async (callback) => {
          const tx = {
            examSession: {
              create: jest.fn().mockResolvedValue({
                ...mockExamSession,
                timeLimit: 3600,
              }),
            },
            examSessionAnswer: {
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
          };
          return callback(tx);
        });

        jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

        const result = await service.startSession(mockUserId, mockExamId);

        expect(result.timeLimit).toBe(3600);
      });
    });

    describe('Error Scenarios', () => {
      it('should throw NotFoundException when exam not found', async () => {
        jest.spyOn(prisma.exam, 'findUnique').mockResolvedValue(null);

        await expect(
          service.startSession(mockUserId, mockExamId),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException when exam is not PUBLISHED', async () => {
        const draftExam = { ...mockExam, status: 'DRAFT' };
        jest
          .spyOn(prisma.exam, 'findUnique')
          .mockResolvedValue(draftExam as any);

        await expect(
          service.startSession(mockUserId, mockExamId),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Transactional Behavior', () => {
      it('should use database transaction for atomicity', async () => {
        jest
          .spyOn(prisma.exam, 'findUnique')
          .mockResolvedValue(mockExam as any);
        jest.spyOn(prisma.examSession, 'findFirst').mockResolvedValue(null);

        const transactionMock = jest.fn(async (callback) => {
          const tx = {
            examSession: {
              create: jest.fn().mockResolvedValue(mockExamSession),
            },
            examSessionAnswer: {
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
          };
          return callback(tx);
        });

        jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

        await service.startSession(mockUserId, mockExamId);

        expect(transactionMock).toHaveBeenCalled();
      });
    });
  });

  describe('submitExam', () => {
    it('should find session and update answers', async () => {
      const submitDto = {
        answers: [
          { questionId: 'q1', selectedOptionId: 'opt1' },
          { questionId: 'q2', selectedOptionId: 'opt2' },
        ],
      };

      jest
        .spyOn(prisma.examSession, 'findFirst')
        .mockResolvedValue(mockExamSession as any);

      const transactionMock = jest.fn(async (callback) => {
        const tx = {
          examSessionAnswer: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          examSession: {
            update: jest.fn().mockResolvedValue({
              ...mockExamSession,
              status: ExamSessionStatus.SUBMITTED,
            }),
          },
        };
        return callback(tx);
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

      await service.submitExam(mockUserId, mockExamId, submitDto as any);

      expect(prisma.examSession.findFirst).toHaveBeenCalled();
      expect(transactionMock).toHaveBeenCalled();
    });

    it('should throw NotFoundException when no active session', async () => {
      jest.spyOn(prisma.examSession, 'findFirst').mockResolvedValue(null);

      await expect(
        service.submitExam(mockUserId, mockExamId, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
