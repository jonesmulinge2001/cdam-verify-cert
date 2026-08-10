import { CertificateStatus } from './enums';

export interface Certificate {
  id: string;
  certId: string;
  status: CertificateStatus;
  fileUrl: string | null;
  issuedAt: string;
  emailSentAt: string | null;
  emailBouncedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  issuedBy: { fullName: string };
  studentProgram: {
    student: { fullName: string; email: string };
    program: { name: string; type: string };
  };
}

export interface VerificationResult {
  valid: boolean;
  studentName?: string;
  programName?: string;
  programType?: string;
  issuedAt?: string;
  certId?: string;
  fileUrl?: string | null;
  reason?: 'not_found' | 'revoked' | 'signature_mismatch';
}
