import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, StudentProgram } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { UpdateEnrollmentStatusDto } from './dto/update-status.dto';

@Injectable()
export class StudentProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProgram(programId: string): Promise<
    (StudentProgram & {
      student: { fullName: string; email: string };
      certificate: { certId: string } | null;
      awardLetter: { letterId: string; emailSentAt: Date | null } | null;
    })[]
  > {
    return this.prisma.studentProgram.findMany({
      where: { programId },
      include: {
        student: { select: { fullName: true, email: true } },
        certificate: { select: { certId: true } },
        awardLetter: { select: { letterId: true, emailSentAt: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async updateStatus(id: string, dto: UpdateEnrollmentStatusDto): Promise<StudentProgram> {
    const enrollment = await this.prisma.studentProgram.findUnique({ where: { id } });
    if (!enrollment) throw new NotFoundException('Enrollment record not found');

    const timestampField = this.timestampFieldFor(dto.status);

    return this.prisma.studentProgram.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        ...(timestampField && { [timestampField]: new Date() }),
      },
    });
  }

  private timestampFieldFor(status: EnrollmentStatus): 'enrolledAt' | 'completedAt' | 'withdrawnAt' | null {
    switch (status) {
      case EnrollmentStatus.ENROLLED:
        return 'enrolledAt';
      case EnrollmentStatus.COMPLETED:
        return 'completedAt';
      case EnrollmentStatus.WITHDRAWN:
        return 'withdrawnAt';
      default:
        return null;
    }
  }
}