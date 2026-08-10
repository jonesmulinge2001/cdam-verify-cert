import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma.service';
import { ImportResult, ImportRowError } from './dto/import-result.dto';

/**
 * Expected CSV columns (case-insensitive, matches a typical Google Form
 * "Responses" sheet exported via File > Download > CSV):
 *   Full Name | Email | Phone | Country
 */
interface RawSheetRow {
  [column: string]: string;
}

interface NormalizedRow {
  fullName: string;
  email: string;
  phone: string | null;
  country: string | null;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importFromCsv(programId: string, fileBuffer: Buffer, actorId: string): Promise<ImportResult> {
    const program = await this.prisma.program.findUnique({ where: { id: programId } });
    if (!program) throw new NotFoundException('Program not found — import target does not exist');

    const rows = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as RawSheetRow[];

    const errors: ImportRowError[] = [];
    let imported = 0;
    let skippedDuplicates = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
      const normalized = this.normalizeRow(rows[i]);

      if (!normalized) {
        errors.push({ row: rowNumber, reason: 'Missing required field: full name or email' });
        continue;
      }

      try {
        const student = await this.prisma.student.upsert({
          where: { email: normalized.email },
          update: {
            fullName: normalized.fullName,
            phone: normalized.phone ?? undefined,
            country: normalized.country ?? undefined,
          },
          create: {
            fullName: normalized.fullName,
            email: normalized.email,
            phone: normalized.phone,
            country: normalized.country,
            sourceRowRef: `sheet-row-${rowNumber}`,
          },
        });

        const existingEnrollment = await this.prisma.studentProgram.findUnique({
          where: { studentId_programId: { studentId: student.id, programId } },
        });

        if (existingEnrollment) {
          skippedDuplicates++;
          continue;
        }

        await this.prisma.studentProgram.create({
          data: { studentId: student.id, programId },
        });
        imported++;
      } catch (error) {
        this.logger.warn(`Row ${rowNumber} failed: ${(error as Error).message}`);
        errors.push({ row: rowNumber, reason: 'Could not save this row — check formatting' });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'STUDENTS_IMPORTED',
        entityType: 'Program',
        entityId: programId,
        metadata: { totalRows: rows.length, imported, skippedDuplicates, errorCount: errors.length },
      },
    });

    return { totalRows: rows.length, imported, skippedDuplicates, errors };
  }

  private normalizeRow(row: RawSheetRow): NormalizedRow | null {
    const get = (candidates: string[]): string | undefined => {
      const key = Object.keys(row).find((k) => candidates.includes(k.trim().toLowerCase()));
      return key ? row[key]?.trim() : undefined;
    };

    const fullName = get(['full name', 'name', 'student name']);
    const email = get(['email', 'email address']);
    const phone = get(['phone', 'phone number', 'mobile']) ?? null;
    const country = get(['country', 'country of residence']) ?? null;

    if (!fullName || !email || !this.isValidEmail(email)) return null;

    return { fullName, email: email.toLowerCase(), phone, country };
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
