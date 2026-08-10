import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Student, StudentProgram } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination-query.dto';

export type StudentWithEnrollments = Student & {
  enrollments: (StudentProgram & { program: { name: string; type: string } })[];
};

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<StudentWithEnrollments>> {
    const where: Prisma.StudentWhereInput = query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { enrollments: { include: { program: { select: { name: true, type: true } } } } },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async findOne(id: string): Promise<StudentWithEnrollments> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { enrollments: { include: { program: { select: { name: true, type: true } } } } },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async create(dto: CreateStudentDto): Promise<Student> {
    const existing = await this.prisma.student.findFirst({ where: { email: dto.email } });

    const student =
      existing ??
      (await this.prisma.student.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          country: dto.country,
        },
      }));

    const alreadyEnrolled = await this.prisma.studentProgram.findUnique({
      where: { studentId_programId: { studentId: student.id, programId: dto.programId } },
    });

    if (alreadyEnrolled) {
      throw new ConflictException('This student is already enrolled in this program');
    }

    await this.prisma.studentProgram.create({
      data: { studentId: student.id, programId: dto.programId },
    });

    return student;
  }

  async update(id: string, dto: UpdateStudentDto): Promise<Student> {
    await this.findOne(id);
    return this.prisma.student.update({ where: { id }, data: dto });
  }
}
