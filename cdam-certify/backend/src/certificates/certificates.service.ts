import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CertificateStatus,
  ProgramType,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

import { PrismaService } from '../prisma.service';
import { QrSigningService } from './qr-signing.service';
import { PdfRendererService } from './pdf-renderer.service';
import { CloudinaryService } from './cloudinary.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly qrSigning: QrSigningService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Issues a certificate for a completed enrollment:
   * generates the certId, renders the PDF, uploads it,
   * and persists the certificate record.
   */
  async generate(
    studentProgramId: string,
    issuedById: string,
  ) {
    const enrollment = await this.prisma.studentProgram.findUnique({
      where: { id: studentProgramId },
      include: {
        student: true,
        program: true,
        certificate: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment record not found');
    }

    if (enrollment.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Only completed enrollments can be certified',
      );
    }

    if (enrollment.certificate) {
      throw new BadRequestException(
        'A certificate has already been issued for this enrollment',
      );
    }

    const template = await this.prisma.certificateTemplate.findFirst({
      where: {
        programType: enrollment.program.type,
        isActive: true,
      },
      orderBy: {
        programId: 'desc',
      },
    });

    if (!template) {
      throw new BadRequestException(
        `No active certificate template for ${enrollment.program.type}`,
      );
    }

    const certId = await this.generateCertId(
      enrollment.program.type,
    );

    const verifyBaseUrl =
      this.config.getOrThrow<string>('PUBLIC_VERIFY_BASE_URL');

    const qrToken = this.qrSigning.sign(certId);

    const verifyUrl = this.qrSigning.buildVerifyUrl(
      verifyBaseUrl,
      certId,
    );

    const qrDataUrl = await QRCode.toDataURL(
      verifyUrl,
      {
        margin: 1,
        width: 240,
      },
    );

    const html = renderTemplate(template.htmlContent, {
      student_name: enrollment.student.fullName,
      program_name: enrollment.program.name,
      program_type: this.formatProgramType(
        enrollment.program.type,
      ),
      start_date: this.formatDate(
        enrollment.program.startDate,
      ),
      end_date: this.formatDate(
        enrollment.program.endDate,
      ),
      cert_id: certId,
      qr_code_data_url: qrDataUrl,
      verify_domain: new URL(verifyBaseUrl).hostname,
      issuer_name: 'Head of Department',
      issuer_title: 'CDAM',
    });

    const pdfBuffer =
      await this.pdfRenderer.renderHtmlToPdf(html);

    const fileUrl =
      await this.cloudinary.uploadPdf(
        pdfBuffer,
        certId,
      );

    const hash = this.computeHash(
      certId,
      enrollment.student.fullName,
      enrollment.program.name,
    );

    const certificate =
      await this.prisma.certificate.create({
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
        metadata: {
          certId,
        },
      },
    });

    return certificate;
  }

  async revoke(
    id: string,
    input: RevokeCertificateInput,
    actorId: string,
  ) {
    const certificate =
      await this.prisma.certificate.findUnique({
        where: { id },
      });

    if (!certificate) {
      throw new NotFoundException(
        'Certificate not found',
      );
    }

    const updated =
      await this.prisma.certificate.update({
        where: { id },
        data: {
          status: CertificateStatus.REVOKED,
          revokedAt: new Date(),
          revokedReason: input.reason,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CERTIFICATE_REVOKED',
        entityType: 'Certificate',
        entityId: id,
        metadata: {
          reason: input.reason,
        },
      },
    });

    return updated;
  }

  async findAll(programId?: string) {
    return this.prisma.certificate.findMany({
      where: programId
        ? {
            studentProgram: {
              programId,
            },
          }
        : undefined,
      include: {
        studentProgram: {
          include: {
            student: true,
            program: true,
          },
        },
        issuedBy: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });
  }

  private async generateCertId(
    type: ProgramType,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const prefix =
      `CDAM-${PROGRAM_TYPE_PREFIX[type]}-${year}`;

    const count =
      await this.prisma.certificate.count({
        where: {
          certId: {
            startsWith: prefix,
          },
        },
      });

    const sequence =
      String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  private computeHash(
    certId: string,
    studentName: string,
    programName: string,
  ): string {
    return crypto
      .createHash('sha256')
      .update(
        `${certId}|${studentName}|${programName}`,
      )
      .digest('hex');
  }

  private formatProgramType(
    type: ProgramType,
  ): string {
    return type
      .replace('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}