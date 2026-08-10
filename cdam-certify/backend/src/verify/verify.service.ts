import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QrSigningService } from '../certificates/qr-signing.service';

export type VerificationResult =
  | {
      valid: true;
      studentName: string;
      programName: string;
      programType: string;
      issuedAt: Date;
      certId: string;
      fileUrl: string | null;
    }
  | { valid: false; reason: 'not_found' | 'revoked' | 'signature_mismatch' };

@Injectable()
export class VerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrSigning: QrSigningService,
  ) {}

  async verify(certId: string, token?: string): Promise<VerificationResult> {
    const normalizedId = certId.trim().toUpperCase();

    // A token is present when the lookup came from a scanned QR — verify the
    // signature so a guessed/enumerated certId without a valid token is rejected.
    if (token && !this.qrSigning.verify(normalizedId, token)) {
      return { valid: false, reason: 'signature_mismatch' };
    }

    const certificate = await this.prisma.certificate.findUnique({
      where: { certId: normalizedId },
      include: { studentProgram: { include: { student: true, program: true } } },
    });

    if (!certificate) return { valid: false, reason: 'not_found' };
    if (certificate.status === 'REVOKED') return { valid: false, reason: 'revoked' };

    return {
      valid: true,
      studentName: certificate.studentProgram.student.fullName,
      programName: certificate.studentProgram.program.name,
      programType: certificate.studentProgram.program.type,
      issuedAt: certificate.issuedAt,
      certId: certificate.certId,
      fileUrl: certificate.fileUrl,
    };
  }
}
