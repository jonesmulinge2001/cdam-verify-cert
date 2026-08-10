import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResult, Student } from '../models/student.model';

export interface StudentQuery {
  page: number;
  pageSize: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private readonly base = `${environment.apiUrl}/students`;

  constructor(private readonly http: HttpClient) {}

  list(query: StudentQuery): Observable<PaginatedResult<Student>> {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<PaginatedResult<Student>>(this.base, { params });
  }
}
