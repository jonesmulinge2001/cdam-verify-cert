import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DomainImportResult, ImportResult } from '../models/import-result.model';
import { ProgramType } from '../models/enums';

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly base = `${environment.apiUrl}/import`;

  constructor(private readonly http: HttpClient) {}

  importStudents(programId: string, file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportResult>(`${this.base}/students/${programId}`, formData);
  }

  /** For sheets with a Domain column spanning several cohorts — one upload, programs auto-matched or created. */
  importStudentsByDomain(programType: ProgramType, file: File): Observable<DomainImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DomainImportResult>(`${this.base}/students-by-domain/${programType}`, formData);
  }
}