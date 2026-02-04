import { Test, TestingModule } from '@nestjs/testing';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamSessionStatus } from '@prisma/client';

describe('ExamsController', () => {
  let controller: ExamsController;
  let service: ExamsService;

  const mockUser = {
    sub: 'test-user-123',
    email: 'test@example.com',
  };

  const mockExam = {
    id: 'exam-123',
    title: 'English Test',
    description: 'Basic English Test',
    status: 'PUBLISHED',
    createdBy: 'admin-123',
    timeLimit: 3600,
    questions: [
      { id: 'q1', sectionType: 'LISTENING' },
      { id: 'q2', sectionType: 'READING' },
      { id: 'q3', sectionType: 'READING' },
    ],
  };

  const mockExamSession = {
    id: 'session-123',
    userId: mockUser.sub,
    examId: mockExam.id,
    status: ExamSessionStatus.IN_PROGRESS,
    startTime: new Date(),
    timeLimit: 3600,
    submittedAt: null,
    deletedAt: null,
    totalCorrect: null,
    totalWrong: null,
    totalUnanswered: null,
    answers: [
      {
        id: 'answer-1',
        sessionId: 'session-123',
        questionId: 'q1',
        selectedOptionId: null,
        answeredAt: null,
        isCorrect: null,
        questionSnapshotHtml: null,
        optionsSnapshotJson: null,
        correctOptionId: null,
      },
      {
        id: 'answer-2',
        sessionId: 'session-123',
        questionId: 'q2',
        selectedOptionId: null,
        answeredAt: null,
        isCorrect: null,
        questionSnapshotHtml: null,
        optionsSnapshotJson: null,
        correctOptionId: null,
      },
      {
        id: 'answer-3',
        sessionId: 'session-123',
        questionId: 'q3',
        selectedOptionId: null,
        answeredAt: null,
        isCorrect: null,
        questionSnapshotHtml: null,
        optionsSnapshotJson: null,
        correctOptionId: null,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [
        {
          provide: ExamsService,
          useValue: {
            createExam: jest.fn(),
            publishExam: jest.fn(),
            submitExam: jest.fn(),
            getPublishedExams: jest.fn(),
            startSession: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ExamsController>(ExamsController);
    service = module.get<ExamsService>(ExamsService);
  });

  describe('startExamSession (UC-01)', () => {
    describe('Success Scenarios', () => {
      it('should create a new exam session when none exists', async () => {
        jest.spyOn(service, 'startSession').mockResolvedValue(mockExamSession);

        const result = await controller.startExamSession(
          { user: mockUser } as any,
          mockExam.id,
        );

        expect(result).toEqual(mockExamSession);
        expect(service.startSession).toHaveBeenCalledWith(
          mockUser.sub,
          mockExam.id,
        );
        expect(result.status).toBe(ExamSessionStatus.IN_PROGRESS);
        expect(result.answers.length).toBe(3);
      });

      it('should resume existing session if one already exists', async () => {
        const existingSession = { ...mockExamSession };
        jest.spyOn(service, 'startSession').mockResolvedValue(existingSession);

        const result = await controller.startExamSession(
          { user: mockUser } as any,
          mockExam.id,
        );

        expect(result).toEqual(existingSession);
        expect(result.status).toBe(ExamSessionStatus.IN_PROGRESS);
      });

      it('should create ExamSessionAnswers for all exam questions', async () => {
        jest.spyOn(service, 'startSession').mockResolvedValue(mockExamSession);

        const result = await controller.startExamSession(
          { user: mockUser } as any,
          mockExam.id,
        );

        expect(result.answers).toHaveLength(mockExam.questions.length);
        result.answers.forEach((answer, index) => {
          expect(answer.questionId).toBe(mockExam.questions[index].id);
          expect(answer.selectedOptionId).toBeNull();
          expect(answer.sessionId).toBe(result.id);
        });
      });

      it('should set startTime to current time', async () => {
        jest.spyOn(service, 'startSession').mockResolvedValue(mockExamSession);

        const result = await controller.startExamSession(
          { user: mockUser } as any,
          mockExam.id,
        );

        expect(result.startTime).toBeDefined();
        expect(result.startTime instanceof Date).toBe(true);
      });

      it('should set timeLimit from exam configuration', async () => {
        jest.spyOn(service, 'startSession').mockResolvedValue(mockExamSession);

        const result = await controller.startExamSession(
          { user: mockUser } as any,
          mockExam.id,
        );

        expect(result.timeLimit).toBe(3600);
      });
    });

    describe('Error Scenarios', () => {
      it('should throw NotFoundException when exam does not exist', async () => {
        jest
          .spyOn(service, 'startSession')
          .mockRejectedValue(
            new NotFoundException('Exam with ID exam-invalid not found'),
          );

        await expect(
          controller.startExamSession(
            { user: mockUser } as any,
            'exam-invalid',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException when exam is not published', async () => {
        jest
          .spyOn(service, 'startSession')
          .mockRejectedValue(new BadRequestException('Exam is not published'));

        await expect(
          controller.startExamSession({ user: mockUser } as any, mockExam.id),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Authorization', () => {
      it('should extract userId from JWT token', async () => {
        jest.spyOn(service, 'startSession').mockResolvedValue(mockExamSession);

        await controller.startExamSession(
          { user: mockUser } as any,
          mockExam.id,
        );

        expect(service.startSession).toHaveBeenCalledWith(
          mockUser.sub,
          mockExam.id,
        );
      });

      it('should allow any authenticated user to start session', async () => {
        const differentUser = {
          sub: 'another-user-456',
          email: 'other@example.com',
        };
        jest.spyOn(service, 'startSession').mockResolvedValue(mockExamSession);

        await controller.startExamSession(
          { user: differentUser } as any,
          mockExam.id,
        );

        expect(service.startSession).toHaveBeenCalledWith(
          differentUser.sub,
          mockExam.id,
        );
      });
    });
  });

  describe('Other Endpoints', () => {
    it('should create exam', () => {
      const createExamDto = {
        title: 'New Test',
        description: 'Test Description',
        timeLimit: 3600,
      };
      jest
        .spyOn(service, 'createExam')
        .mockResolvedValue({ id: 'new-exam' } as any);

      controller.createExam({ user: mockUser } as any, createExamDto);

      expect(service.createExam).toHaveBeenCalledWith(
        mockUser.sub,
        createExamDto,
      );
    });

    it('should publish exam', () => {
      jest
        .spyOn(service, 'publishExam')
        .mockResolvedValue({ status: 'PUBLISHED' } as any);

      controller.publishExam(mockExam.id);

      expect(service.publishExam).toHaveBeenCalledWith(mockExam.id);
    });

    it('should get published exam', () => {
      jest
        .spyOn(service, 'getPublishedExams')
        .mockResolvedValue(mockExam as any);

      controller.getPublishedExams(mockExam.id);

      expect(service.getPublishedExams).toHaveBeenCalledWith(mockExam.id);
    });
  });
});
