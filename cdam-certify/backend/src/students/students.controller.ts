import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Student, UserRole } from '@prisma/client';
import { StudentsService, StudentWithEnrollments } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResult<StudentWithEnrollments>> {
    return this.studentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<StudentWithEnrollments> {
    return this.studentsService.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateStudentDto): Promise<Student> {
    return this.studentsService.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto): Promise<Student> {
    return this.studentsService.update(id, dto);
  }
}
