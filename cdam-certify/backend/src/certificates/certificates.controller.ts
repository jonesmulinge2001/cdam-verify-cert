import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserRole } from '@prisma/client';

import { CertificatesService } from './certificates.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

import { IsArray, IsString } from 'class-validator';

export class BulkIssueDto {
  @IsArray()
  @IsString({ each: true })
  studentProgramIds!: string[];
}

export class RevokeDto {
  @IsString()
  reason!: string;
}

interface GenerateCertificateJobData {
  studentProgramId: string;
  issuedById: string;
}

@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,

    @InjectQueue('certificate-generation')
    private readonly generationQueue: Queue<GenerateCertificateJobData>,
  ) {}

  @Get()
  findAll(@Query('programId') programId?: string) {
    return this.certificatesService.findAll(programId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('issue/:studentProgramId')
  async issueOne(
    @Param('studentProgramId') studentProgramId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.certificatesService.generate(
      studentProgramId,
      user.id,
    );
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('issue-bulk')
  async issueBulk(
    @Body() dto: BulkIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ queued: number }> {
    await this.generationQueue.addBulk(
      dto.studentProgramIds.map((studentProgramId) => ({
        name: 'generate',
        data: {
          studentProgramId,
          issuedById: user.id,
        },
      })),
    );

    return {
      queued: dto.studentProgramIds.length,
    };
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post(':id/revoke')
  revoke(
    @Param('id') id: string,
    @Body() dto: RevokeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.certificatesService.revoke(
      id,
      dto,
      user.id,
    );
  }
}