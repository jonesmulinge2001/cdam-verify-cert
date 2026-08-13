import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AwardLettersService } from './award-letters.service';

export interface GenerateAwardLetterJobData {
  studentProgramId: string;
  issuedById: string;
}

export interface SendAwardLetterEmailJobData {
  awardLetterId: string;
}

@Injectable()
@Processor('award-letter-generation')
export class AwardLetterGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(AwardLetterGenerationProcessor.name);

  constructor(
    private readonly awardLettersService: AwardLettersService,
    @InjectQueue('award-letter-email') private readonly emailQueue: Queue<SendAwardLetterEmailJobData>,
  ) {
    super();
  }

  async process(job: Job<GenerateAwardLetterJobData>): Promise<void> {
    const awardLetter = await this.awardLettersService.generate(job.data.studentProgramId, job.data.issuedById);
    await this.emailQueue.add('send', { awardLetterId: awardLetter.id });
    this.logger.log(`Generated award letter ${awardLetter.letterId}`);
  }
}

@Injectable()
@Processor('award-letter-email')
export class AwardLetterEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(AwardLetterEmailProcessor.name);

  constructor(private readonly awardLettersService: AwardLettersService) {
    super();
  }

  async process(job: Job<SendAwardLetterEmailJobData>): Promise<void> {
    await this.awardLettersService.sendEmail(job.data.awardLetterId);
    this.logger.log(`Emailed award letter ${job.data.awardLetterId}`);
  }
}