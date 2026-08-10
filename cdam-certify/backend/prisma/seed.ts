/**
 * One-off CLI import — useful for the very first backfill from an
 * existing Google Sheet export before the admin UI is in daily use.
 * Ongoing imports should go through POST /import/students/:programId instead,
 * since that path validates auth, records an audit log, and returns a report.
 *
 * Usage: npx ts-node prisma/seed.ts <programId> <path-to-csv>
 */
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface RawRow {
  [column: string]: string;
}

async function main(): Promise<void> {
  const [programId, csvPath] = process.argv.slice(2);
  if (!programId || !csvPath) {
    console.error('Usage: npx ts-node prisma/seed.ts <programId> <path-to-csv>');
    process.exit(1);
  }

  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) {
    console.error(`No program found with id ${programId}`);
    process.exit(1);
  }

  const rows = parse(fs.readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawRow[];

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const fullName = row['Full Name'] ?? row['Name'];
    const email = (row['Email'] ?? '').toLowerCase();
    if (!fullName || !email) {
      skipped++;
      continue;
    }

    const student = await prisma.student.upsert({
      where: { email },
      update: { fullName },
      create: { fullName, email, phone: row['Phone'] ?? null, country: row['Country'] ?? null },
    });

    await prisma.studentProgram.upsert({
      where: { studentId_programId: { studentId: student.id, programId } },
      update: {},
      create: { studentId: student.id, programId },
    });

    imported++;
  }

  console.log(`Imported ${imported} students into "${program.name}" (${skipped} rows skipped)`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
