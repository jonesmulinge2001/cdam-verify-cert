-- DropIndex
DROP INDEX "students_email_key";

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "emailBouncedAt" TIMESTAMP(3),
ADD COLUMN     "emailSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "award_letter_templates" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "award_letter_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_letters" (
    "id" TEXT NOT NULL,
    "letterId" TEXT NOT NULL,
    "studentProgramId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSentAt" TIMESTAMP(3),
    "emailBouncedAt" TIMESTAMP(3),

    CONSTRAINT "award_letters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "award_letter_templates_programId_key" ON "award_letter_templates"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "award_letters_letterId_key" ON "award_letters"("letterId");

-- CreateIndex
CREATE UNIQUE INDEX "award_letters_studentProgramId_key" ON "award_letters"("studentProgramId");

-- CreateIndex
CREATE INDEX "award_letters_letterId_idx" ON "award_letters"("letterId");

-- AddForeignKey
ALTER TABLE "award_letter_templates" ADD CONSTRAINT "award_letter_templates_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_letters" ADD CONSTRAINT "award_letters_studentProgramId_fkey" FOREIGN KEY ("studentProgramId") REFERENCES "student_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_letters" ADD CONSTRAINT "award_letters_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "award_letter_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_letters" ADD CONSTRAINT "award_letters_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
