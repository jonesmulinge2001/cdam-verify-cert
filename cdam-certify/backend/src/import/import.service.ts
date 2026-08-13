import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { ProgramType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { DomainImportResult, ImportResult, ImportRowError } from './dto/import-result.dto';

/**
 * Expected CSV columns (case-insensitive, matches a typical Google Form
 * "Responses" sheet exported via File > Download > CSV):
 *   Full Name | Email | Phone | Country
 * For domain-based sheets (e.g. internships spanning several departments):
 *   Internship Id | Full Name | Domain | Email
 */
interface RawSheetRow {
  [column: string]: string;
}

interface NormalizedRow {
  fullName: string;
  email: string;
  phone: string | null;
  country: string | null;
  externalId: string | null;
  domain: string | null;
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
            sourceRowRef: normalized.externalId ?? `sheet-row-${rowNumber}`,
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

  /**
   * For sheets that span several cohorts in one tab (e.g. an internships
   * sheet with a "Domain" column covering multiple departments). Each
   * distinct domain value is matched to an existing Program by name, or
   * created fresh under the given ProgramType if no match exists.
   */
  async importByDomain(
    programType: ProgramType,
    fileBuffer: Buffer,
    actorId: string,
  ): Promise<DomainImportResult> {
    const rows = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as RawSheetRow[];

    const errors: ImportRowError[] = [];
    const programsCreated: string[] = [];
    const programsMatched: string[] = [];
    const programIdByDomain = new Map<string, string>();
    let imported = 0;
    let skippedDuplicates = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      const normalized = this.normalizeRow(rows[i]);

      if (!normalized) {
        errors.push({ row: rowNumber, reason: 'Missing required field: full name or email' });
        continue;
      }
      if (!normalized.domain) {
        errors.push({ row: rowNumber, reason: 'Missing Domain — cannot determine which program this row belongs to' });
        continue;
      }

      try {
        const programId = await this.resolveProgramForDomain(
          normalized.domain,
          programType,
          programIdByDomain,
          programsCreated,
          programsMatched,
        );

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
            sourceRowRef: normalized.externalId ?? `sheet-row-${rowNumber}`,
          },
        });

        const existingEnrollment = await this.prisma.studentProgram.findUnique({
          where: { studentId_programId: { studentId: student.id, programId } },
        });

        if (existingEnrollment) {
          skippedDuplicates++;
          continue;
        }

        await this.prisma.studentProgram.create({ data: { studentId: student.id, programId } });
        imported++;
      } catch (error) {
        this.logger.warn(`Row ${rowNumber} failed: ${(error as Error).message}`);
        errors.push({ row: rowNumber, reason: 'Could not save this row — check formatting' });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'STUDENTS_IMPORTED_BY_DOMAIN',
        entityType: 'ProgramType',
        entityId: programType,
        metadata: {
          totalRows: rows.length,
          imported,
          skippedDuplicates,
          errorCount: errors.length,
          programsCreated,
          programsMatched,
        },
      },
    });

    return { totalRows: rows.length, imported, skippedDuplicates, errors, programsCreated, programsMatched };
  }

  /**
   * Programs are matched by exact name (case-insensitive). A domain seen for
   * the first time becomes a new Program with a placeholder 90-day window —
   * admins should confirm/adjust the actual dates from the Programs page.
   */
  private async resolveProgramForDomain(
    domain: string,
    programType: ProgramType,
    cache: Map<string, string>,
    created: string[],
    matched: string[],
  ): Promise<string> {
    const key = domain.trim().toLowerCase();
    const cached = cache.get(key);
    if (cached) return cached;

    const existing = await this.prisma.program.findFirst({
      where: { name: { equals: domain.trim(), mode: 'insensitive' }, type: programType },
    });

    if (existing) {
      cache.set(key, existing.id);
      if (!matched.includes(existing.name)) matched.push(existing.name);
      return existing.id;
    }

    const now = new Date();
    const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const program = await this.prisma.program.create({
      data: {
        name: domain.trim(),
        type: programType,
        cohortLabel: 'Imported — dates pending review',
        startDate: now,
        endDate: ninetyDaysOut,
      },
    });

    cache.set(key, program.id);
    created.push(program.name);
    return program.id;
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
    const externalId = get(['internship id', 'application id', 'id']) ?? null;
    const domain = get(['domain', 'domain (program)', 'program', 'department']) ?? null;

    if (!fullName || !email || !this.isValidEmail(email)) return null;

    return { fullName, email: email.toLowerCase(), phone, country, externalId, domain };
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}