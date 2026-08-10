import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Certificate } from '../models/certificate.model';

@Injectable({ providedIn: 'root' })
export class CertificatesService {
  private readonly base = `${environment.apiUrl}/certificates`;

  constructor(private readonly http: HttpClient) {}

  list(programId?: string): Observable<Certificate[]> {
    const params = programId ? new HttpParams().set('programId', programId) : undefined;
    return this.http.get<Certificate[]>(this.base, { params });
  }

  issueOne(studentProgramId: string): Observable<Certificate> {
    return this.http.post<Certificate>(`${this.base}/issue/${studentProgramId}`, {});
  }

  issueBulk(studentProgramIds: string[]): Observable<{ queued: number }> {
    return this.http.post<{ queued: number }>(`${this.base}/issue-bulk`, { studentProgramIds });
  }

  resend(certificateId: string): Observable<{ queued: true }> {
    return this.http.post<{ queued: true }>(`${this.base}/${certificateId}/resend`, {});
  }

  revoke(certificateId: string, reason: string): Observable<Certificate> {
    return this.http.post<Certificate>(`${this.base}/${certificateId}/revoke`, { reason });
  }
}
