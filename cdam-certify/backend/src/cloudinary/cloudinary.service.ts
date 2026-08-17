import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export enum CdamDocumentType {
  CERTIFICATE = 'certificate',
  AWARD_LETTER = 'award_letter',
}

interface CdamUploadConfig {
  folder: string;
  maxSizeBytes: number;
}

const UPLOAD_CONFIG: Record<CdamDocumentType, CdamUploadConfig> = {
  [CdamDocumentType.CERTIFICATE]: {
    folder: 'cdam-certify/certificates',
    maxSizeBytes: 10 * 1024 * 1024, // 10MB — generous headroom for a one-page A4 PDF
  },
  [CdamDocumentType.AWARD_LETTER]: {
    folder: 'cdam-certify/award-letters',
    maxSizeBytes: 10 * 1024 * 1024,
  },
};

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  /**
   * Configured lazily, on first upload, rather than in a lifecycle hook —
   * a missing Cloudinary credential should fail the specific issuance
   * request with a clear message, not crash the entire API on boot.
   */
  private ensureConfigured(): void {
    if (this.configured) return;

    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'File storage is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the backend .env file',
      );
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    this.configured = true;
  }

  /**
   * Uploads a generated PDF (certificate or award letter) and returns only
   * the Cloudinary secure URL — the PDF bytes themselves are never persisted
   * anywhere else, including the database.
   */
  async uploadPdf(buffer: Buffer, publicId: string, documentType: CdamDocumentType): Promise<string> {
    this.ensureConfigured();

    const config = UPLOAD_CONFIG[documentType];
    if (buffer.byteLength > config.maxSizeBytes) {
      throw new ServiceUnavailableException(`Generated PDF exceeds the ${config.maxSizeBytes / (1024 * 1024)}MB limit`);
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: config.folder,
          public_id: publicId,
          resource_type: 'raw',
          format: 'pdf',
          overwrite: true,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed for ${publicId}: ${error?.message ?? 'unknown error'}`);
            reject(new ServiceUnavailableException(`Cloudinary upload failed: ${error?.message ?? 'unknown error'}`));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }
}
