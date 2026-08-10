import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { StudentProgram, UserRole } from '@prisma/client';
import { StudentProgramsService } from './student-programs.service';
import { UpdateEnrollmentStatusDto } from './dto/update-status.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('student-programs')
export class StudentProgramsController {
  constructor(private readonly service: StudentProgramsService) {}

  @Get('by-program/:programId')
  findByProgram(@Param('programId') programId: string) {
    return this.service.findByProgram(programId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentStatusDto,
  ): Promise<StudentProgram> {
    return this.service.updateStatus(id, dto);
  }
}
