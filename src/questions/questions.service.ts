import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionFilterDto } from './dto/question-filter.dto';
import { BulkActionDto } from './dto/bulk-action.dto';

/**
 * Questions Service - Business Logic Layer
 */
@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. GET ONE - Lấy 1 question by ID (include options)
   */
  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id, deletedAt: null },
      include: {
        options: {
          orderBy: { orderNo: 'asc' },
        },
        creator: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return question;
  }

  /**
   * 2. CREATE - Tạo question mới + options
   */
  async create(createQuestionDto: CreateQuestionDto, userId: string) {
    return this.prisma.question.create({
      data: {
        title: createQuestionDto.title,
        sectionType: createQuestionDto.sectionType,
        contentHtml: createQuestionDto.contentHtml,
        explanationHtml: createQuestionDto.explanationHtml,
        status: 'DRAFT',
        createdBy: userId,
        options: {
          create: createQuestionDto.options.map((opt) => ({
            contentHtml: opt.contentHtml,
            isCorrect: opt.isCorrect,
            orderNo: opt.orderNo,
          })),
        },
      },
      include: { options: true },
    });
  }

  /**
   * 3. UPDATE - Cập nhật question + options
   * Note: Xóa hết options cũ, tạo lại từ đầu (đơn giản hơn)
   */
  async update(id: string, updateQuestionDto: UpdateQuestionDto) {
    // Check question exists
    await this.findOne(id);

    // Prepare update data (chỉ update fields được gửi lên)
    const updateData: Prisma.QuestionUpdateInput = {};
    if (updateQuestionDto.title !== undefined)
      updateData.title = updateQuestionDto.title!;
    if (updateQuestionDto.sectionType !== undefined)
      updateData.sectionType = updateQuestionDto.sectionType!;
    if (updateQuestionDto.contentHtml !== undefined)
      updateData.contentHtml = updateQuestionDto.contentHtml!;
    if (updateQuestionDto.explanationHtml !== undefined)
      updateData.explanationHtml = updateQuestionDto.explanationHtml!;

    // Nếu có update options, xóa hết options cũ + tạo lại
    if (updateQuestionDto.options) {
      return this.prisma.question.update({
        where: { id },
        data: {
          ...updateData,
          options: {
            deleteMany: {}, // Xóa hết options cũ
            create: updateQuestionDto.options!.map((opt) => ({
              contentHtml: opt.contentHtml,
              isCorrect: opt.isCorrect,
              orderNo: opt.orderNo,
            })),
          },
        },
        include: { options: true },
      });
    }

    // Nếu không có options, chỉ update question
    return this.prisma.question.update({
      where: { id },
      data: updateData,
      include: { options: true },
    });
  }

  /**
   * 4. SOFT DELETE - Move to trash
   */
  async softDelete(id: string) {
    await this.findOne(id);

    return this.prisma.question.update({
      where: { id },
      data: {
        status: 'DRAFT',
        deletedAt: new Date(),
      },
    });
  }

  /**
   * 5. RESTORE - Khôi phục từ trash
   */
  async restore(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    if (!question.deletedAt) {
      throw new BadRequestException('Question is not deleted');
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        deletedAt: null,
        status: 'DRAFT',
      },
    });
  }

  /**
   * 6. LIST - Lấy danh sách với filters, pagination
   */
  async findAll(filters: QuestionFilterDto) {
    const {
      page = 1,
      limit = 20,
      sectionType,
      keyword,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    const where: Prisma.QuestionWhereInput = {
      deletedAt: null, // Không lấy câu hỏi đã xóa
    };

    if (sectionType) {
      where.sectionType = sectionType;
    }

    if (keyword) {
      // Chỉ search trong title (performance + đủ dùng)
      // Không search contentHtml vì quá dài, chậm
      where.title = { contains: keyword, mode: 'insensitive' };
    }

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          options: { orderBy: { orderNo: 'asc' } },
          creator: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data: questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 7. DUPLICATE - Copy question
   */
  async duplicate(id: string, userId: string) {
    const original = await this.findOne(id);

    return this.prisma.question.create({
      data: {
        title: `${original.title} (Copy)`,
        sectionType: original.sectionType,
        contentHtml: original.contentHtml,
        explanationHtml: original.explanationHtml,
        status: 'DRAFT',
        createdBy: userId,
        options: {
          create: original.options.map((opt) => ({
            contentHtml: opt.contentHtml,
            isCorrect: opt.isCorrect,
            orderNo: opt.orderNo,
          })),
        },
      },
      include: { options: true },
    });
  }

  /**
   * 8. CHECK USAGE - Kiểm tra question có trong exam nào
   */
  async checkUsage(id: string) {
    await this.findOne(id);

    const exams = await this.prisma.examQuestion.findMany({
      where: { questionId: id },
      include: {
        exam: {
          select: { id: true, title: true },
        },
      },
    });

    return {
      isUsed: exams.length > 0,
      count: exams.length,
      exams: exams.map((eq) => ({
        examId: eq.exam.id,
        examTitle: eq.exam.title,
      })),
    };
  }

  /**
   * 9. BULK DELETE
   */
  async bulkDelete(bulkActionDto: BulkActionDto) {
    const result = await this.prisma.question.updateMany({
      where: {
        id: { in: bulkActionDto.ids },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        status: 'DRAFT',
      },
    });

    return { deleted: result.count };
  }

  /**
   * 10. BULK RESTORE
   */
  async bulkRestore(bulkActionDto: BulkActionDto) {
    const result = await this.prisma.question.updateMany({
      where: {
        id: { in: bulkActionDto.ids },
        deletedAt: { not: null },
      },
      data: {
        deletedAt: null,
        status: 'DRAFT',
      },
    });

    return { restored: result.count };
  }
}
