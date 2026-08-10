import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateProgramPayload, Program, ProgramWithCounts } from '../models/program.model';

@Injectable({ providedIn: 'root' })
export class ProgramsService {
  private readonly base = `${environment.apiUrl}/programs`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<ProgramWithCounts[]> {
    return this.http.get<ProgramWithCounts[]>(this.base);
  }

  get(id: string): Observable<Program> {
    return this.http.get<Program>(`${this.base}/${id}`);
  }

  create(payload: CreateProgramPayload): Observable<Program> {
    return this.http.post<Program>(this.base, payload);
  }

  setActive(id: string, isActive: boolean): Observable<Program> {
    return this.http.patch<Program>(`${this.base}/${id}`, { isActive });
  }
}
