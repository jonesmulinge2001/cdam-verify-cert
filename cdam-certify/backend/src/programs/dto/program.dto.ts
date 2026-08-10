import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ProgramType } from '@prisma/client';

export class CreateProgramDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsEnum(ProgramType)
  type!: ProgramType;

  @IsOptional()
  @IsString()
  cohortLabel?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class UpdateProgramDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  isActive?: boolean;
}
