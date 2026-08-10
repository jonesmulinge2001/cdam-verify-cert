import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class QrSigningService {
  constructor(private readonly config: ConfigService) {}

  /** Produces a short signature so the verify endpoint can reject forged certIds. */
  sign(certId: string): string {
    const secret = this.config.getOrThrow<string>('QR_SIGNING_SECRET');
    return crypto.createHmac('sha256', secret).update(certId).digest('hex').slice(0, 24);
  }

  verify(certId: string, token: string): boolean {
    const expected = this.sign(certId);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token.padEnd(24, '0')));
  }

  buildVerifyUrl(baseUrl: string, certId: string): string {
    return `${baseUrl}/${certId}?t=${this.sign(certId)}`;
  }
}
