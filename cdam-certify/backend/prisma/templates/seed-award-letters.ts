/**
 * Seeds the six internship domain award letter templates. Each domain gets
 * its own Program (if not already created by a CSV import) and its own
 * AwardLetterTemplate row — one letter template per domain, as required.
 *
 * Safe to re-run: matches existing programs by name, and updates the
 * template in place rather than duplicating rows.
 *
 * Usage: npx ts-node prisma/seed-award-templates.ts
 */
import { PrismaClient, ProgramType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface DomainSeed {
  name: string;
  note: string;
}

const DOMAINS: DomainSeed[] = [
  {
    name: 'Machine Learning',
    note:
      'Over the course of this internship you will work on applied machine learning tasks — ' +
      'model development, training, and evaluation — using real datasets under CDAM supervision.',
  },
  {
    name: 'Data Science',
    note:
      'Over the course of this internship you will work on applied data analysis, statistical reasoning, ' +
      'and visualization, turning raw data into actionable insight under CDAM supervision.',
  },
  {
    name: 'Software Development',
    note:
      'Over the course of this internship you will work across the software development lifecycle — ' +
      'design, implementation, testing, and collaborative delivery — under CDAM supervision.',
  },
  {
    name: 'Web Development',
    note:
      'Over the course of this internship you will build and ship web applications, covering both ' +
      'client-facing interfaces and the systems that power them, under CDAM supervision.',
  },
  {
    name: 'Backend Development',
    note:
      'Over the course of this internship you will work on server-side systems — API design, database ' +
      'architecture, and reliable, scalable backend services — under CDAM supervision.',
  },
  {
    name: 'Frontend Development',
    note:
      'Over the course of this internship you will craft user interfaces and client-side applications, ' +
      'with attention to usability, performance, and responsive design, under CDAM supervision.',
  },
];

async function main(): Promise<void> {
  const skeletonPath = path.join(__dirname, 'templates', 'award-letter.html');
  const skeleton = fs.readFileSync(skeletonPath, 'utf-8');

  const now = new Date();
  const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  for (const domain of DOMAINS) {
    let program = await prisma.program.findFirst({
      where: { name: domain.name, type: ProgramType.INTERNSHIP },
    });

    if (!program) {
      program = await prisma.program.create({
        data: {
          name: domain.name,
          type: ProgramType.INTERNSHIP,
          cohortLabel: 'Standing internship track',
          startDate: now,
          endDate: ninetyDaysOut,
        },
      });
    }

    const htmlContent = skeleton.replace('{{domain_note}}', domain.note);

    await prisma.awardLetterTemplate.upsert({
      where: { programId: program.id },
      update: { htmlContent, isActive: true },
      create: { programId: program.id, htmlContent, isActive: true },
    });

    console.log(`Award letter template ready for "${domain.name}"`);
  }

  console.log(`\nDone — ${DOMAINS.length} domain award letter templates ready.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());