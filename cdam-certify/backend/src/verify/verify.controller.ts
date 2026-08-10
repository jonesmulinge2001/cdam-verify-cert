import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/roles.decorator';
import { VerifyService, VerificationResult } from './verify.service';

@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // 20 lookups/min per IP — deters enumeration
  @Get(':certId')
  verify(@Param('certId') certId: string, @Query('t') token?: string): Promise<VerificationResult> {
    return this.verifyService.verify(certId, token);
  }
}
