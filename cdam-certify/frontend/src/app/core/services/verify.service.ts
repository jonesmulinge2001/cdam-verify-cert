import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VerificationResult } from '../models/certificate.model';

@Injectable({ providedIn: 'root' })
export class VerifyService {
  private readonly base = `${environment.apiUrl}/verify`;

  constructor(private readonly http: HttpClient) {}

  verify(certId: string, token?: string): Observable<VerificationResult> {
    const url = token ? `${this.base}/${certId}?t=${token}` : `${this.base}/${certId}`;
    return this.http.get<VerificationResult>(url);
  }
}
