import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserRole } from '@prisma/client';
import { IsArray, IsString } from 'class-validator';
import { AwardLettersService } from './award-letters.service';
import { GenerateAwardLetterJobData, SendAwardLetterEmailJobData } from './award-letters.processor';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

export class BulkIssueAwardLettersDto {
  @IsArray()
  @IsString({ each: true })
  studentProgramIds!: string[];
}

@Controller('award-letters')
export class AwardLettersController {
  constructor(
    private readonly awardLettersService: AwardLettersService,
    @InjectQueue('award-letter-generation')
    private readonly generationQueue: Queue<GenerateAwardLetterJobData>,
    @InjectQueue('award-letter-email')
    private readonly emailQueue: Queue<SendAwardLetterEmailJobData>,
  ) {}

  @Get()
  findAll(@Query('programId') programId?: string) {
    return this.awardLettersService.findAll(programId);
  }

  /** Enrollments in a program that haven't received an award letter yet — the usual "just imported" set. */
  @Get('pending/:programId')
  findPending(@Param('programId') programId: string) {
    return this.awardLettersService.findPendingByProgram(programId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('issue-bulk')
  async issueBulk(
    @Body() dto: BulkIssueAwardLettersDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ queued: number }> {
    await this.generationQueue.addBulk(
      dto.studentProgramIds.map((studentProgramId) => ({
        name: 'generate',
        data: { studentProgramId, issuedById: user.id },
      })),
    );
    return { queued: dto.studentProgramIds.length };
  }

  /** Issues award letters to every enrollment in a program that doesn't have one yet — the typical post-import action. */
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('issue-all-pending/:programId')
  async issueAllPending(
    @Param('programId') programId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ queued: number }> {
    const pending = await this.awardLettersService.findPendingByProgram(programId);
    await this.generationQueue.addBulk(
      pending.map((enrollment) => ({
        name: 'generate',
        data: { studentProgramId: enrollment.id, issuedById: user.id },
      })),
    );
    return { queued: pending.length };
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post(':id/resend')
  async resend(@Param('id') id: string): Promise<{ queued: true }> {
    await this.emailQueue.add('send', { awardLetterId: id });
    return { queued: true };
  }
}