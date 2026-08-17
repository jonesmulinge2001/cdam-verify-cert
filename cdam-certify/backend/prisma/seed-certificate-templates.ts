/**
 * Seeds a type-level default CertificateTemplate (programId: null) for each
 * ProgramType, using the shared default-certificate.html skeleton. This
 * unblocks completion-certificate issuance immediately.
 *
 * If you later want distinct completion-certificate wording per internship
 * domain (mirroring the six award letter templates), create program-specific
 * CertificateTemplate rows instead — those take priority over this default
 * automatically (see CertificatesService.resolveTemplate).
 *
 * Safe to re-run: updates the existing default in place rather than duplicating it.
 *
 * Usage: npx ts-node prisma/seed-certificate-templates.ts
 */
import { PrismaClient, ProgramType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const PROGRAM_TYPES: ProgramType[] = [ProgramType.SHORT_COURSE, ProgramType.INTERNSHIP, ProgramType.ATTACHMENT];

async function main(): Promise<void> {
  const skeletonPath = path.join(__dirname, 'templates', 'default-certificate.html');
  const htmlContent = fs.readFileSync(skeletonPath, 'utf-8');

  for (const programType of PROGRAM_TYPES) {
    const existing = await prisma.certificateTemplate.findFirst({
      where: { programType, programId: null },
    });

    if (existing) {
      await prisma.certificateTemplate.update({
        where: { id: existing.id },
        data: { htmlContent, isActive: true },
      });
      console.log(`Updated default certificate template for ${programType}`);
    } else {
      await prisma.certificateTemplate.create({
        data: {
          name: `${programType} — Default Certificate`,
          programType,
          programId: null,
          htmlContent,
          isActive: true,
        },
      });
      console.log(`Created default certificate template for ${programType}`);
    }
  }

  console.log(`\nDone — every program type now has a fallback completion certificate template.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());