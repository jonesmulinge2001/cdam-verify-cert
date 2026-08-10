import { Module } from '@nestjs/common';
import { StudentProgramsController } from './student-programs.controller';
import { StudentProgramsService } from './student-programs.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [StudentProgramsController],
  providers: [StudentProgramsService, PrismaService],
  exports: [StudentProgramsService],
})
export class StudentProgramsModule {}
