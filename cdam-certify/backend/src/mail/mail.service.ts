import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface CertificateEmailPayload {
  toEmail: string;
  studentName: string;
  programName: string;
  certId: string;
  /** Omit for documents with no public verification record (e.g. award letters). */
  verifyUrl?: string;
  pdfBuffer: Buffer;
  /** "certificate" or "award letter" — controls wording only, not behaviour. */
  documentLabel: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resendClient: Resend | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Resend is initialized lazily rather than in the constructor so a missing
   * RESEND_API_KEY doesn't crash the whole API on boot — it only surfaces
   * as an error when an admin actually tries to send an email, with a
   * message that says exactly what's missing.
   */
  private getClient(): Resend {
    if (this.resendClient) return this.resendClient;

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Email sending is not configured — set RESEND_API_KEY in the backend .env file',
      );
    }

    this.resendClient = new Resend(apiKey);
    return this.resendClient;
  }

  async sendCertificateEmail(payload: CertificateEmailPayload): Promise<void> {
    const fromAddress = this.config.get<string>('MAIL_FROM');
    if (!fromAddress) {
      throw new ServiceUnavailableException('Email sending is not configured — set MAIL_FROM in the backend .env file');
    }

    const { error } = await this.getClient().emails.send({
      from: fromAddress,
      to: payload.toEmail,
      subject: `Your ${payload.programName} ${payload.documentLabel} is ready`,
      html: this.buildBody(payload),
      attachments: [
        {
          filename: `CDAM-${this.slugify(payload.documentLabel)}-${payload.certId}.pdf`,
          content: payload.pdfBuffer,
        },
      ],
    });

    if (error) {
      this.logger.error(`Failed to send ${payload.documentLabel} email to ${payload.toEmail}: ${error.message}`);
      throw new Error(error.message);
    }
  }

  private buildBody(payload: CertificateEmailPayload): string {
    const capitalizedLabel = payload.documentLabel.replace(/\b\w/g, (c) => c.toUpperCase());
    const isAwardLetter = payload.documentLabel === 'award letter';
    const introLine = isAwardLetter
      ? `Congratulations — you have been accepted into <strong>${payload.programName}</strong> at CDAM, Chuka University.`
      : `Congratulations on completing <strong>${payload.programName}</strong> at CDAM, Chuka University.`;
    const verifyLine = payload.verifyUrl
      ? `<p>You can verify its authenticity at any time at:<br/>
        <a href="${payload.verifyUrl}">${payload.verifyUrl}</a></p>`
      : '';
    return `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <p>Dear ${payload.studentName},</p>
        <p>${introLine}</p>
        <p>Your ${payload.documentLabel} is attached to this email as a PDF.</p>
        ${verifyLine}
        <p>${capitalizedLabel} ID: <strong>${payload.certId}</strong></p>
        <p style="margin-top: 24px;">Regards,<br/>CDAM, Chuka University</p>
      </div>
    `;
  }

  private slugify(value: string): string {
    return value.replace(/\s+/g, '-');
  }
}