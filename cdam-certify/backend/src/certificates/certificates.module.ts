import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateGenerationProcessor, CertificateEmailProcessor } from './certificates.processor';
import { QrSigningService } from './qr-signing.service';
import { PdfRendererService } from './pdf-renderer.service';
import { PrismaService } from '../prisma.service';
import { MailModule } from '../mail/mail.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MailModule,
    CloudinaryModule,
    BullModule.registerQueue({ name: 'certificate-generation' }, { name: 'certificate-email' }),
  ],
  controllers: [CertificatesController],
  providers: [
    CertificatesService,
    CertificateGenerationProcessor,
    CertificateEmailProcessor,
    QrSigningService,
    PdfRendererService,
    PrismaService,
  ],
  exports: [CertificatesService, QrSigningService],
})
export class CertificatesModule {}
