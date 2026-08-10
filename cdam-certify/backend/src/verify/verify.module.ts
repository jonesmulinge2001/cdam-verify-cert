import { Module } from '@nestjs/common';
import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';
import { PrismaService } from '../prisma.service';
import { QrSigningService } from '../certificates/qr-signing.service';

@Module({
  controllers: [VerifyController],
  providers: [VerifyService, PrismaService, QrSigningService],
})
export class VerifyModule {}
