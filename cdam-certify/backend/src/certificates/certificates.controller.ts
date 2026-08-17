import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Certificate, UserRole } from '@prisma/client';
import { CertificatesService } from './certificates.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { IsArray, IsString } from 'class-validator';
import { GenerateCertificateJobData, SendCertificateEmailJobData } from './certificates.processor';

export class BulkIssueDto {
  @IsArray()
  @IsString({ each: true })
  studentProgramIds!: string[];
}

export class RevokeDto {
  @IsString()
  reason!: string;
}

export interface BulkIssueResult {
  studentProgramId: string;
  success: boolean;
  certificate?: Certificate;
  error?: string;
}

@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    @InjectQueue('certificate-generation')
    private readonly generationQueue: Queue<GenerateCertificateJobData>,
    @InjectQueue('certificate-email')
    private readonly emailQueue: Queue<SendCertificateEmailJobData>,
  ) {}

  @Get()
  findAll(@Query('programId') programId?: string) {
    return this.certificatesService.findAll(programId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('issue/:studentProgramId')
  async issueOne(@Param('studentProgramId') studentProgramId: string, @CurrentUser() user: AuthenticatedUser) {
    const certificate = await this.certificatesService.generate(studentProgramId, user.id);
    await this.emailQueue.add('send', { certificateId: certificate.id });
    return certificate;
  }

  /**
   * Generates every certificate inline, in the request, and reports a real
   * success/failure per student — no silent background failures. Fine for
   * the batch sizes an admin actually selects by hand (a handful to a few
   * dozen). For very large imports, POST /issue-bulk-queued below stays
   * available as a fire-and-forget alternative.
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('issue-bulk')
  async issueBulk(@Body() dto: BulkIssueDto, @CurrentUser() user: AuthenticatedUser): Promise<BulkIssueResult[]> {
    const results: BulkIssueResult[] = [];

    for (const studentProgramId of dto.studentProgramIds) {
      try {
        const certificate = await this.certificatesService.generate(studentProgramId, user.id);
        await this.emailQueue.add('send', { certificateId: certificate.id });
        results.push({ studentProgramId, success: true, certificate });
      } catch (error) {
        results.push({ studentProgramId, success: false, error: (error as Error).message });
      }
    }

    return results;
  }

  /** Fire-and-forget variant for very large batches — no per-student result, check the Certificates list afterward. */
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('issue-bulk-queued')
  async issueBulkQueued(@Body() dto: BulkIssueDto, @CurrentUser() user: AuthenticatedUser): Promise<{ queued: number }> {
    await this.generationQueue.addBulk(
      dto.studentProgramIds.map((studentProgramId) => ({
        name: 'generate',
        data: { studentProgramId, issuedById: user.id },
      })),
    );
    return { queued: dto.studentProgramIds.length };
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post(':id/resend')
  async resend(@Param('id') id: string): Promise<{ queued: true }> {
    await this.emailQueue.add('send', { certificateId: id });
    return { queued: true };
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post(':id/revoke')
  revoke(@Param('id') id: string, @Body() dto: RevokeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.certificatesService.revoke(id, dto, user.id);
  }
}