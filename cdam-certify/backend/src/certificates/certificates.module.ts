import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { QrSigningService } from './qr-signing.service';
import { PdfRendererService } from './pdf-renderer.service';
import { CloudinaryService } from './cloudinary.service';
import { PrismaService } from '../prisma.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'certificate-generation' }, { name: 'certificate-email' }),
    MailModule
  ],
  controllers: [CertificatesController],
  providers: [
    CertificatesService,
    QrSigningService,
    PdfRendererService,
    CloudinaryService,
    PrismaService,
  ],
  exports: [CertificatesService, QrSigningService],
})
export class CertificatesModule {}
