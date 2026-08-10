import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Program, UserRole } from '@prisma/client';
import { ProgramsService, ProgramWithCounts } from './programs.service';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  findAll(): Promise<ProgramWithCounts[]> {
    return this.programsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Program> {
    return this.programsService.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateProgramDto): Promise<Program> {
    return this.programsService.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProgramDto): Promise<Program> {
    return this.programsService.update(id, dto);
  }
}
