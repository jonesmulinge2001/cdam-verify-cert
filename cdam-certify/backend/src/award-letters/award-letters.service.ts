import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AwardLetter } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PdfRendererService } from '../certificates/pdf-renderer.service';
import { CloudinaryService, CdamDocumentType } from '../cloudinary/cloudinary.service';
import { MailService } from '../mail/mail.service';
import { renderTemplate } from '../certificates/template-renderer.util';

/**
 * Award letters are acceptance notices — "you've been accepted into the
 * Machine Learning internship" — sent right after a student is imported and
 * enrolled. They are NOT gated behind completion, unlike Certificate, which
 * requires status COMPLETED. A student typically receives an award letter
 * first, and a completion certificate much later, as two independent documents.
 */
@Injectable()
export class AwardLettersService {
  private readonly logger = new Logger(AwardLettersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly cloudinary: CloudinaryService,
    private readonly mailService: MailService,
  ) {}

  async generate(studentProgramId: string, issuedById: string): Promise<AwardLetter> {
    const enrollment = await this.prisma.studentProgram.findUnique({
      where: { id: studentProgramId },
      include: { student: true, program: true, awardLetter: true },
    });

    if (!enrollment) throw new NotFoundException('Enrollment record not found');
    if (enrollment.awardLetter) {
      throw new BadRequestException('An award letter has already been issued for this enrollment');
    }

    const template = await this.prisma.awardLetterTemplate.findUnique({
      where: { programId: enrollment.programId },
    });
    if (!template || !template.isActive) {
      throw new BadRequestException(
        `No award letter template configured for "${enrollment.program.name}" — seed one before issuing`,
      );
    }

    const letterId = await this.generateLetterId();

    const html = renderTemplate(template.htmlContent, {
      student_name: enrollment.student.fullName,
      program_name: enrollment.program.name,
      start_date: this.formatDate(enrollment.program.startDate),
      end_date: this.formatDate(enrollment.program.endDate),
      cert_id: letterId,
      issuer_name: 'Head of Department',
      issuer_title: 'CDAM',
    });

    const pdfBuffer = await this.pdfRenderer.renderHtmlToPdf(html);
    const fileUrl = await this.cloudinary.uploadPdf(pdfBuffer, letterId, CdamDocumentType.AWARD_LETTER);

    const awardLetter = await this.prisma.awardLetter.create({
      data: {
        letterId,
        studentProgramId,
        templateId: template.id,
        fileUrl,
        issuedById,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: issuedById,
        action: 'AWARD_LETTER_ISSUED',
        entityType: 'AwardLetter',
        entityId: awardLetter.id,
        metadata: { letterId },
      },
    });

    return awardLetter;
  }

  async sendEmail(awardLetterId: string): Promise<void> {
    const awardLetter = await this.prisma.awardLetter.findUnique({
      where: { id: awardLetterId },
      include: { studentProgram: { include: { student: true, program: true } } },
    });
    if (!awardLetter || !awardLetter.fileUrl) {
      throw new NotFoundException('Award letter not found or has no generated file');
    }

    const pdfResponse = await fetch(awardLetter.fileUrl);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    try {
      await this.mailService.sendCertificateEmail({
        toEmail: awardLetter.studentProgram.student.email,
        studentName: awardLetter.studentProgram.student.fullName,
        programName: awardLetter.studentProgram.program.name,
        certId: awardLetter.letterId,
        pdfBuffer,
        documentLabel: 'award letter',
      });
      await this.prisma.awardLetter.update({
        where: { id: awardLetterId },
        data: { emailSentAt: new Date(), emailBouncedAt: null },
      });
    } catch (error) {
      this.logger.error(`Award letter email failed for ${awardLetter.letterId}: ${(error as Error).message}`);
      if (!(error instanceof ServiceUnavailableException)) {
        await this.prisma.awardLetter.update({
          where: { id: awardLetterId },
          data: { emailBouncedAt: new Date() },
        });
      }
      throw error;
    }
  }

  /** All enrollments in a program that don't yet have an award letter — the typical "just imported" set. */
  async findPendingByProgram(programId: string): Promise<{ id: string }[]> {
    return this.prisma.studentProgram.findMany({
      where: { programId, awardLetter: null },
      select: { id: true },
    });
  }

  async findAll(programId?: string) {
    return this.prisma.awardLetter.findMany({
      where: programId ? { studentProgram: { programId } } : undefined,
      include: {
        studentProgram: { include: { student: true, program: true } },
        issuedBy: { select: { fullName: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  private async generateLetterId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CDAM-AWD-${year}`;
    const count = await this.prisma.awardLetter.count({ where: { letterId: { startsWith: prefix } } });
    const sequence = String(count + 1).padStart(5, '0');
    return `${prefix}-${sequence}`;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }
}
