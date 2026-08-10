import { Injectable, NotFoundException } from '@nestjs/common';
import { Program } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';

export interface ProgramWithCounts extends Program {
  totalApplicants: number;
  totalCompleted: number;
  totalCertified: number;
}

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ProgramWithCounts[]> {
    const programs = await this.prisma.program.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        enrollments: {
          select: { status: true, certificate: { select: { id: true } } },
        },
      },
    });

    return programs.map(({ enrollments, ...program }) => ({
      ...program,
      totalApplicants: enrollments.length,
      totalCompleted: enrollments.filter((e) => e.status === 'COMPLETED').length,
      totalCertified: enrollments.filter((e) => e.certificate !== null).length,
    }));
  }

  async findOne(id: string): Promise<Program> {
    const program = await this.prisma.program.findUnique({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  create(dto: CreateProgramDto): Promise<Program> {
    return this.prisma.program.create({
      data: {
        name: dto.name,
        type: dto.type,
        cohortLabel: dto.cohortLabel,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async update(id: string, dto: UpdateProgramDto): Promise<Program> {
    await this.findOne(id);
    return this.prisma.program.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
