import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentsService } from '../../../core/services/students.service';
import { Student } from '../../../core/models/student.model';
import { SkeletonRowsComponent } from '../../../shared/components/skeleton/skeleton-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonRowsComponent, EmptyStateComponent, BadgeComponent],
  template: `
    <div class="max-w-7xl mx-auto px-8 py-8">
      <header class="mb-8 animate-fade-up">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="font-display text-3xl font-semibold text-black">Students</h1>
            <p class="text-sm mt-1.5 text-black/60">Everyone who has applied across every CDAM program. Import cohorts from the program page.</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 px-4 py-2 rounded-xl" style="background: #b355c008; border: 1px solid #b355c020;">
              <span class="material-icons text-sm" style="color: #cf39da;">groups</span>
              <span class="text-sm font-medium text-black">{{ total() }} total</span>
            </div>
          </div>
        </div>
      </header>

      <div class="mb-6 relative max-w-sm animate-fade-up" style="animation-delay: 100ms;">
        <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-black/30 text-[19px]">search</span>
        <input
          type="text"
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearchChange()"
          placeholder="Search by name or email"
          class="w-full rounded-xl border px-3 py-2.5 pl-10 text-sm text-black transition-all duration-300 focus:outline-none"
          style="border-color: #b355c020; background: white;"
        />
      </div>

      @if (loading()) {
        <div class="animate-fade-up" style="animation-delay: 100ms;">
          <app-skeleton-rows [rows]="6" />
        </div>
      } @else if (students().length === 0) {
        <div class="animate-fade-up" style="animation-delay: 100ms;">
          <app-empty-state icon="groups" title="No students found" description="Try a different search, or import a cohort from a program." />
        </div>
      } @else {
        <div class="bg-white rounded-2xl shadow-card overflow-hidden transition-all duration-300 hover:shadow-xl animate-fade-up" 
             style="animation-delay: 100ms; border: 1px solid #b355c010;">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wide text-black/50" style="background: #b355c004;">
                  <th class="px-5 py-4 font-semibold">Student</th>
                  <th class="px-5 py-4 font-semibold">Country</th>
                  <th class="px-5 py-4 font-semibold">Enrollments</th>
                </tr>
              </thead>
              <tbody>
                @for (student of students(); track student.id; let idx = $index) {
                  <tr class="border-t transition-all duration-300 hover:scale-[1.002] hover:shadow-sm" 
                      style="border-color: #b355c008;"
                      [style.animation-delay]="(idx * 50) + 'ms'"
                      [class]="idx % 2 === 0 ? 'bg-white' : 'bg-[#b355c002]'">
                    <td class="px-5 py-4">
                      <p class="font-medium text-black">{{ student.fullName }}</p>
                      <p class="text-xs mt-0.5 text-black/40">{{ student.email }}</p>
                    </td>
                    <td class="px-5 py-4 text-black/60">{{ student.country ?? '—' }}</td>
                    <td class="px-5 py-4">
                      <div class="flex flex-wrap gap-1.5">
                        @for (enrollment of student.enrollments; track enrollment.id) {
                          <app-badge [tone]="enrollment.certificate ? 'emerald' : 'sand'">
                            {{ enrollment.program.name }}
                          </app-badge>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex items-center justify-between mt-4 text-sm animate-fade-up" style="animation-delay: 150ms;">
          <span class="text-black/40">Page {{ page() }} of {{ totalPages() }} &middot; {{ total() }} students</span>
          <div class="flex gap-2">
            <button
              type="button"
              [disabled]="page() <= 1"
              (click)="goToPage(page() - 1)"
              class="rounded-xl border px-3 py-1.5 text-black/60 transition-all duration-300 disabled:opacity-40 hover:scale-105"
              style="border-color: #b355c020; background: white;"
            >
              Previous
            </button>
            <button
              type="button"
              [disabled]="page() >= totalPages()"
              (click)="goToPage(page() + 1)"
              class="rounded-xl border px-3 py-1.5 text-black/60 transition-all duration-300 disabled:opacity-40 hover:scale-105"
              style="border-color: #b355c020; background: white;"
            >
              Next
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

    * {
      font-family: 'Poppins', sans-serif;
    }

    .font-display {
      font-family: 'Poppins', sans-serif;
    }

    @keyframes fade-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    .animate-fade-up {
      animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }

    .shadow-card {
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
    }

    /* Table row hover effect */
    tbody tr {
      position: relative;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    tbody tr:hover {
      background: #b355c004 !important;
    }

    tbody tr::after {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.3s;
      background: linear-gradient(90deg, transparent, #b355c008, transparent);
      background-size: 200% 100%;
      pointer-events: none;
    }

    tbody tr:hover::after {
      opacity: 1;
      animation: shimmer 1.5s ease-in-out infinite;
    }

    /* Search input focus states */
    input:focus {
      border-color: #cf39da !important;
      box-shadow: 0 0 0 4px #b355c020 !important;
    }

    input:hover {
      border-color: #b355c060 !important;
    }

    input::placeholder {
      color: #b355c040;
    }

    input:focus::placeholder {
      color: #b355c080;
    }

    /* Badge overrides for custom styling */
    ::ng-deep app-badge {
      display: inline-block;
    }

    /* Custom scrollbar for table */
    .overflow-x-auto::-webkit-scrollbar {
      height: 6px;
    }
    .overflow-x-auto::-webkit-scrollbar-track {
      background: #b355c004;
      border-radius: 3px;
    }
    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: linear-gradient(90deg, #ff0000, #cf39da, #b355c0);
      border-radius: 3px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      td, th {
        padding: 0.75rem 0.75rem !important;
      }
      
      header {
        flex-direction: column;
        gap: 1rem;
      }
      
      header > div:last-child {
        width: 100%;
      }
    }

    @media (max-width: 640px) {
      .animate-fade-up {
        animation-duration: 0.4s;
      }
      
      .flex.items-center.justify-between {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }
      
      .flex.gap-2 {
        justify-content: center;
      }
    }
  `]
})
export class StudentsComponent implements OnInit {
  private readonly studentsService = inject(StudentsService);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  protected readonly loading = signal(true);
  protected readonly students = signal<Student[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);
  protected searchTerm = '';

  ngOnInit(): void {
    this.fetch();
  }

  protected onSearchChange(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.page.set(1);
      this.fetch();
    }, 350);
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.studentsService
      .list({ page: this.page(), pageSize: 20, search: this.searchTerm || undefined })
      .subscribe({
        next: (result) => {
          this.students.set(result.items);
          this.totalPages.set(result.totalPages || 1);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}