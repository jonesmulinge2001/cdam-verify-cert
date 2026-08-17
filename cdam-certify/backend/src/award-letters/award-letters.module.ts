import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AwardLettersController } from './award-letters.controller';
import { AwardLettersService } from './award-letters.service';
import { AwardLetterGenerationProcessor, AwardLetterEmailProcessor } from './award-letters.processor';
import { PrismaService } from '../prisma.service';
import { PdfRendererService } from '../certificates/pdf-renderer.service';
import { MailModule } from '../mail/mail.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MailModule,
    CloudinaryModule,
    BullModule.registerQueue({ name: 'award-letter-generation' }, { name: 'award-letter-email' }),
  ],
  controllers: [AwardLettersController],
  providers: [
    AwardLettersService,
    AwardLetterGenerationProcessor,
    AwardLetterEmailProcessor,
    PdfRendererService,
    PrismaService,
  ],
  exports: [AwardLettersService],
})
export class AwardLettersModule {}
