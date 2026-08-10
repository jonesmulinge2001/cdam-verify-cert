import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { ImportService } from './import.service';
import { ImportResult } from './dto/import-result.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

interface UploadedCsvFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — a cohort sheet is never larger

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('students/:programId')
  @UseInterceptors(FileInterceptor('file'))
  async importStudents(
    @Param('programId') programId: string,
    @UploadedFile() file: UploadedCsvFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('Attach a CSV file exported from your Google Sheet');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File is too large — export a single cohort at a time');
    }

    return this.importService.importFromCsv(programId, file.buffer, user.id);
  }
}
