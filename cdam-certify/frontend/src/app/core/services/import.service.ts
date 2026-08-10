import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImportResult } from '../models/import-result.model';

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly base = `${environment.apiUrl}/import`;

  constructor(private readonly http: HttpClient) {}

  importStudents(programId: string, file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportResult>(`${this.base}/students/${programId}`, formData);
  }
}
