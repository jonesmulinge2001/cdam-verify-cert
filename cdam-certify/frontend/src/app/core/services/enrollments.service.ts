import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EnrollmentStatus } from '../models/enums';

export interface EnrollmentRow {
  id: string;
  status: EnrollmentStatus;
  appliedAt: string;
  completedAt: string | null;
  student: { fullName: string; email: string };
  certificate: { certId: string } | null;
}

@Injectable({ providedIn: 'root' })
export class EnrollmentsService {
  private readonly base = `${environment.apiUrl}/student-programs`;

  constructor(private readonly http: HttpClient) {}

  byProgram(programId: string): Observable<EnrollmentRow[]> {
    return this.http.get<EnrollmentRow[]>(`${this.base}/by-program/${programId}`);
  }

  updateStatus(id: string, status: EnrollmentStatus): Observable<EnrollmentRow> {
    return this.http.patch<EnrollmentRow>(`${this.base}/${id}/status`, { status });
  }
}
