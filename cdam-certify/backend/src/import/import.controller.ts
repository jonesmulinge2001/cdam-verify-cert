import {
  BadRequestException,
  Controller,
  Param,
  ParseEnumPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProgramType, UserRole } from '@prisma/client';
import { ImportService } from './import.service';
import { DomainImportResult, ImportResult } from './dto/import-result.dto';
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

  /**
   * For sheets that cover several cohorts in one tab via a Domain column
   * (e.g. an internships sheet spanning multiple departments). Programs are
   * matched by name or auto-created under the given ProgramType.
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('students-by-domain/:programType')
  @UseInterceptors(FileInterceptor('file'))
  async importStudentsByDomain(
    @Param('programType', new ParseEnumPipe(ProgramType)) programType: ProgramType,
    @UploadedFile() file: UploadedCsvFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DomainImportResult> {
    if (!file) {
      throw new BadRequestException('Attach a CSV file exported from your Google Sheet');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File is too large — export a single sheet at a time');
    }

    return this.importService.importByDomain(programType, file.buffer, user.id);
  }
}