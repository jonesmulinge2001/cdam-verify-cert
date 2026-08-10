import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProgramsService } from '../../../core/services/programs.service';
import { ProgramWithCounts } from '../../../core/models/program.model';
import { SkeletonRowsComponent } from '../../../shared/components/skeleton/skeleton-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonRowsComponent, EmptyStateComponent],
  template: `
    <div class="max-w-7xl mx-auto px-8 py-8">
      <header class="mb-8 animate-fade-up">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="font-display text-3xl font-semibold text-black">Dashboard</h1>
            <p class="text-sm mt-1.5 text-black/60">Applicants, completions, and certificates issued across every cohort.</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 px-4 py-2 rounded-xl" style="background: #b355c008; border: 1px solid #b355c020;">
              <span class="material-icons text-sm" style="color: #cf39da;">dashboard</span>
              <span class="text-sm font-medium text-black">{{ programs().length }} programs</span>
            </div>
          </div>
        </div>
      </header>

      @if (loading()) {
        <div class="animate-fade-up" style="animation-delay: 100ms;">
          <app-skeleton-rows [rows]="4" />
        </div>
      } @else if (programs().length === 0) {
        <div class="animate-fade-up" style="animation-delay: 100ms;">
          <app-empty-state
            icon="school"
            title="No programs yet"
            description="Create your first short course, internship, or attachment to start tracking applicants."
          />
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-up transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" 
               style="animation-delay: 0ms; border: 1px solid #b355c010;">
            <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-xl flex items-center justify-center" style="background: #b355c010;">
                <span class="material-icons text-sm" style="color: #cf39da;">people</span>
              </div>
              <p class="text-sm text-black/60">Total applicants</p>
            </div>
            <p class="font-display text-3xl font-semibold text-black mt-1">{{ totalApplicants() }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-up transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" 
               style="animation-delay: 60ms; border: 1px solid #b355c010;">
            <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-xl flex items-center justify-center" style="background: #b355c010;">
                <span class="material-icons text-sm" style="color: #cf39da;">check_circle</span>
              </div>
              <p class="text-sm text-black/60">Completed programs</p>
            </div>
            <p class="font-display text-3xl font-semibold text-black mt-1">{{ totalCompleted() }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-up transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" 
               style="animation-delay: 120ms; border: 1px solid #b355c010;">
            <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-xl flex items-center justify-center" style="background: #b355c010;">
                <span class="material-icons text-sm" style="color: #ff0000;">verified</span>
              </div>
              <p class="text-sm text-black/60">Certificates issued</p>
            </div>
            <p class="font-display text-3xl font-semibold mt-1" style="color: #cf39da;">{{ totalCertified() }}</p>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-card overflow-hidden transition-all duration-300 hover:shadow-xl animate-fade-up" 
             style="animation-delay: 180ms; border: 1px solid #b355c010;">
          <div class="px-5 py-4 flex items-center justify-between" style="border-bottom: 1px solid #b355c010;">
            <h2 class="font-display text-sm font-medium text-black">Active cohorts</h2>
            <a routerLink="/admin/programs" 
               class="text-sm font-medium transition-all duration-300 hover:scale-105 inline-flex items-center gap-1"
               style="color: #cf39da;">
              View all <span class="material-icons text-[16px]">arrow_forward</span>
            </a>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wide text-black/50" style="background: #b355c004;">
                  <th class="px-5 py-4 font-semibold">Program</th>
                  <th class="px-5 py-4 font-semibold">Applicants</th>
                  <th class="px-5 py-4 font-semibold">Completed</th>
                  <th class="px-5 py-4 font-semibold">Certified</th>
                </tr>
              </thead>
              <tbody>
                @for (program of programs(); track program.id; let idx = $index) {
                  <tr
                    [routerLink]="['/admin/programs', program.id]"
                    class="border-t transition-all duration-300 hover:scale-[1.002] hover:shadow-sm cursor-pointer"
                    style="border-color: #b355c008;"
                    [style.animation-delay]="(idx * 50) + 'ms'"
                    [class]="idx % 2 === 0 ? 'bg-white' : 'bg-[#b355c002]'"
                  >
                    <td class="px-5 py-4">
                      <p class="font-medium text-black">{{ program.name }}</p>
                      <p class="text-xs mt-0.5 text-black/40">{{ program.cohortLabel ?? program.type }}</p>
                    </td>
                    <td class="px-5 py-4 text-black/60">{{ program.totalApplicants }}</td>
                    <td class="px-5 py-4 text-black/60">{{ program.totalCompleted }}</td>
                    <td class="px-5 py-4 font-medium" style="color: #cf39da;">{{ program.totalCertified }}</td>
                  </tr>
                }
              </tbody>
            </table>
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
      
      .grid-cols-1.sm\\:grid-cols-3 {
        grid-template-columns: 1fr !important;
      }
    }

    @media (max-width: 640px) {
      .animate-fade-up {
        animation-duration: 0.4s;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly programsService = inject(ProgramsService);

  protected readonly loading = signal(true);
  protected readonly programs = signal<ProgramWithCounts[]>([]);

  ngOnInit(): void {
    this.programsService.list().subscribe({
      next: (programs) => {
        this.programs.set(programs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected totalApplicants(): number {
    return this.programs().reduce((sum, p) => sum + p.totalApplicants, 0);
  }

  protected totalCompleted(): number {
    return this.programs().reduce((sum, p) => sum + p.totalCompleted, 0);
  }

  protected totalCertified(): number {
    return this.programs().reduce((sum, p) => sum + p.totalCertified, 0);
  }
}