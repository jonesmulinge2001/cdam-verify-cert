import { ProgramType } from './enums';

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  cohortLabel: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProgramWithCounts extends Program {
  totalApplicants: number;
  totalCompleted: number;
  totalCertified: number;
}

export interface CreateProgramPayload {
  name: string;
  type: ProgramType;
  cohortLabel?: string;
  startDate: string;
  endDate: string;
}
