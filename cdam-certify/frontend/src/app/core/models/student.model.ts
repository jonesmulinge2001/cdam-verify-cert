import { EnrollmentStatus } from './enums';

export interface EnrollmentSummary {
  id: string;
  status: EnrollmentStatus;
  appliedAt: string;
  completedAt: string | null;
  program: { name: string; type: string };
  certificate: { certId: string } | null;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  country: string | null;
  createdAt: string;
  enrollments: EnrollmentSummary[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
