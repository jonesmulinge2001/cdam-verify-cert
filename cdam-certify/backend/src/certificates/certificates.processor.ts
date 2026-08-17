import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { CertificatesService } from './certificates.service';

export interface GenerateCertificateJobData {
  studentProgramId: string;
  issuedById: string;
}

export interface SendCertificateEmailJobData {
  certificateId: string;
}

@Injectable()
@Processor('certificate-generation')
export class CertificateGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(CertificateGenerationProcessor.name);

  constructor(
    private readonly certificatesService: CertificatesService,
    @InjectQueue('certificate-email') private readonly emailQueue: Queue<SendCertificateEmailJobData>,
  ) {
    super();
  }

  async process(job: Job<GenerateCertificateJobData>): Promise<void> {
    const certificate = await this.certificatesService.generate(
      job.data.studentProgramId,
      job.data.issuedById,
    );
    await this.emailQueue.add('send', { certificateId: certificate.id });
    this.logger.log(`Generated certificate ${certificate.certId}`);
  }
}

@Injectable()
@Processor('certificate-email')
export class CertificateEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(CertificateEmailProcessor.name);

  constructor(private readonly certificatesService: CertificatesService) {
    super();
  }

  async process(job: Job<SendCertificateEmailJobData>): Promise<void> {
    await this.certificatesService.sendEmail(job.data.certificateId);
    this.logger.log(`Emailed certificate ${job.data.certificateId}`);
  }
}
