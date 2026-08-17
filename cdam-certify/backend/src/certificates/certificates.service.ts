import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Certificate, CertificateStatus, ProgramType } from '@prisma/client';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma.service';
import { QrSigningService } from './qr-signing.service';
import { PdfRendererService } from './pdf-renderer.service';
import { CloudinaryService, CdamDocumentType } from '../cloudinary/cloudinary.service';
import { MailService } from '../mail/mail.service';
import { renderTemplate } from './template-renderer.util';

const PROGRAM_TYPE_PREFIX: Record<ProgramType, string> = {
  SHORT_COURSE: 'SC',
  INTERNSHIP: 'IN',
  ATTACHMENT: 'AT',
};

export interface RevokeCertificateInput {
  reason: string;
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly qrSigning: QrSigningService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly cloudinary: CloudinaryService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Issues a certificate for a completed enrollment: generates the certId,
   * renders the PDF, uploads it, and persists the record. Does NOT send the
   * email — that is queued separately so a slow mail provider never blocks issuance.
   */
  async generate(studentProgramId: string, issuedById: string): Promise<Certificate> {
    const enrollment = await this.prisma.studentProgram.findUnique({
      where: { id: studentProgramId },
      include: { student: true, program: true, certificate: true },
    });

    if (!enrollment) throw new NotFoundException('Enrollment record not found');
    if (enrollment.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed enrollments can be certified');
    }
    if (enrollment.certificate) {
      throw new BadRequestException('A certificate has already been issued for this enrollment');
    }

    const template = await this.resolveTemplate(enrollment.programId, enrollment.program.type);
    if (!template) {
      throw new BadRequestException(
        `No active certificate template found for "${enrollment.program.name}" or for ${enrollment.program.type}`,
      );
    }

    const certId = await this.generateCertId(enrollment.program.type);
    const verifyBaseUrl = this.config.getOrThrow<string>('PUBLIC_VERIFY_BASE_URL');
    const qrToken = this.qrSigning.sign(certId);
    const verifyUrl = this.qrSigning.buildVerifyUrl(verifyBaseUrl, certId);
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });

    const html = renderTemplate(template.htmlContent, {
      student_name: enrollment.student.fullName,
      program_name: enrollment.program.name,
      program_type: this.formatProgramType(enrollment.program.type),
      start_date: this.formatDate(enrollment.program.startDate),
      end_date: this.formatDate(enrollment.program.endDate),
      cert_id: certId,
      qr_code_data_url: qrDataUrl,
      verify_domain: new URL(verifyBaseUrl).hostname,
      issuer_name: 'Head of Department',
      issuer_title: 'CDAM',
      document_label: 'certificate',
    });

    const pdfBuffer = await this.pdfRenderer.renderHtmlToPdf(html);
    const fileUrl = await this.cloudinary.uploadPdf(pdfBuffer, certId, CdamDocumentType.CERTIFICATE);
    const hash = this.computeHash(certId, enrollment.student.fullName, enrollment.program.name);

    const certificate = await this.prisma.certificate.create({
      data: {
        certId,
        studentProgramId,
        templateId: template.id,
        hash,
        qrToken,
        fileUrl,
        issuedById,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: issuedById,
        action: 'CERTIFICATE_ISSUED',
        entityType: 'Certificate',
        entityId: certificate.id,
        metadata: { certId },
      },
    });

    return certificate;
  }

  async sendEmail(certificateId: string): Promise<void> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { studentProgram: { include: { student: true, program: true } } },
    });
    if (!certificate || !certificate.fileUrl) {
      throw new NotFoundException('Certificate not found or has no generated file');
    }

    const pdfResponse = await fetch(certificate.fileUrl);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const verifyBaseUrl = this.config.getOrThrow<string>('PUBLIC_VERIFY_BASE_URL');

    try {
      await this.mailService.sendCertificateEmail({
        toEmail: certificate.studentProgram.student.email,
        studentName: certificate.studentProgram.student.fullName,
        programName: certificate.studentProgram.program.name,
        certId: certificate.certId,
        verifyUrl: `${verifyBaseUrl}/${certificate.certId}`,
        pdfBuffer,
        documentLabel: 'certificate',
      });
      await this.prisma.certificate.update({
        where: { id: certificateId },
        data: { emailSentAt: new Date(), emailBouncedAt: null },
      });
    } catch (error) {
      this.logger.error(`Email send failed for ${certificate.certId}: ${(error as Error).message}`);
      if (!(error instanceof ServiceUnavailableException)) {
        // A real delivery failure (bad address, provider rejection) — a config
        // error shouldn't be recorded as a bounce, since retrying won't help
        // until the .env is fixed.
        await this.prisma.certificate.update({
          where: { id: certificateId },
          data: { emailBouncedAt: new Date() },
        });
      }
      throw error;
    }
  }

  async revoke(id: string, input: RevokeCertificateInput, actorId: string): Promise<Certificate> {
    const certificate = await this.prisma.certificate.findUnique({ where: { id } });
    if (!certificate) throw new NotFoundException('Certificate not found');

    const updated = await this.prisma.certificate.update({
      where: { id },
      data: { status: CertificateStatus.REVOKED, revokedAt: new Date(), revokedReason: input.reason },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CERTIFICATE_REVOKED',
        entityType: 'Certificate',
        entityId: id,
        metadata: { reason: input.reason },
      },
    });

    return updated;
  }

  async findAll(programId?: string) {
    return this.prisma.certificate.findMany({
      where: programId ? { studentProgram: { programId } } : undefined,
      include: {
        studentProgram: { include: { student: true, program: true } },
        issuedBy: { select: { fullName: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  private async generateCertId(type: ProgramType): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CDAM-${PROGRAM_TYPE_PREFIX[type]}-${year}`;
    const count = await this.prisma.certificate.count({ where: { certId: { startsWith: prefix } } });
    const sequence = String(count + 1).padStart(5, '0');
    return `${prefix}-${sequence}`;
  }

  private computeHash(certId: string, studentName: string, programName: string): string {
    return crypto.createHash('sha256').update(`${certId}|${studentName}|${programName}`).digest('hex');
  }

  /**
   * A program-specific template (e.g. the Machine Learning award letter)
   * always wins over the generic type-level default. This match is on
   * programId, not just programType — six INTERNSHIP domains can each carry
   * completely different wording without stepping on one another.
   */
  private async resolveTemplate(programId: string, programType: ProgramType) {
    const specific = await this.prisma.certificateTemplate.findFirst({
      where: { programId, isActive: true },
    });
    if (specific) return specific;

    return this.prisma.certificateTemplate.findFirst({
      where: { programType, programId: null, isActive: true },
    });
  }

  private formatProgramType(type: ProgramType): string {
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }
}
