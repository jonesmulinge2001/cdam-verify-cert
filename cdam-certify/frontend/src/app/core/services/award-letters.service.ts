import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AwardLettersService {
  private readonly base = `${environment.apiUrl}/award-letters`;

  constructor(private readonly http: HttpClient) {}

  /** Issues award letters to every enrollment in a program that doesn't have one yet. */
  issueAllPending(programId: string): Observable<{ queued: number }> {
    return this.http.post<{ queued: number }>(`${this.base}/issue-all-pending/${programId}`, {});
  }

  resend(awardLetterId: string): Observable<{ queued: true }> {
    return this.http.post<{ queued: true }>(`${this.base}/${awardLetterId}/resend`, {});
  }
}