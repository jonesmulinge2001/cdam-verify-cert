import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProgramsService } from '../../../core/services/programs.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProgramWithCounts } from '../../../core/models/program.model';
import { ProgramType } from '../../../core/models/enums';
import { BadgeComponent, BadgeTone } from '../../../shared/components/badge/badge.component';
import { SkeletonRowsComponent } from '../../../shared/components/skeleton/skeleton-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

const TYPE_TONE: Record<ProgramType, BadgeTone> = {
  [ProgramType.SHORT_COURSE]: 'emerald',
  [ProgramType.INTERNSHIP]: 'clay',
  [ProgramType.ATTACHMENT]: 'sand',
};

@Component({
  selector: 'app-programs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BadgeComponent, SkeletonRowsComponent, EmptyStateComponent],
  template: `
    <div class="max-w-7xl mx-auto px-8 py-8">
      <header class="mb-8 flex items-start justify-between animate-fade-up">
        <div>
          <h1 class="font-display text-3xl font-semibold text-black">Programs</h1>
          <p class="text-sm mt-1.5 text-black/60">Short courses, internships, and attachments run by CDAM.</p>
        </div>
        <button
          type="button"
          (click)="panelOpen.set(true)"
          class="inline-flex items-center gap-1.5 rounded-xl text-white text-sm font-medium px-4 py-2.5 transition-all duration-300 relative overflow-hidden group"
          style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);"
        >
          <span class="relative z-10 flex items-center gap-1.5">
            <span class="material-icons text-[18px]">add</span>
            New program
          </span>
          <span class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
          <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);"></div>
        </button>
      </header>

      @if (loading()) {
        <div class="animate-fade-up" style="animation-delay: 100ms;">
          <app-skeleton-rows [rows]="4" />
        </div>
      } @else if (programs().length === 0) {
        <div class="animate-fade-up" style="animation-delay: 100ms;">
          <app-empty-state icon="school" title="No programs yet" description="Create your first cohort to get started." />
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (program of programs(); track program.id; let i = $index) {
            <a
              [routerLink]="['/admin/programs', program.id]"
              class="animate-fade-up bg-white rounded-2xl shadow-card p-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 block group"
              style="border: 1px solid #b355c010;"
              [style.animation-delay.ms]="i * 50"
            >
              <div class="flex items-center justify-between mb-3">
                <app-badge [tone]="typeTone(program.type)">{{ typeLabel(program.type) }}</app-badge>
                @if (!program.isActive) {
                  <app-badge tone="sand">Archived</app-badge>
                }
              </div>
              <h3 class="font-display text-base font-medium text-black leading-snug transition-colors duration-300 group-hover:text-[#cf39da]">{{ program.name }}</h3>
              <p class="text-xs mt-1 text-black/50">{{ program.cohortLabel ?? 'No cohort label' }}</p>
              <div class="flex items-center gap-4 mt-4 pt-4" style="border-top: 1px solid #b355c010;">
                <div class="transition-all duration-300 group-hover:scale-105">
                  <p class="text-xs text-black/50">Applicants</p>
                  <p class="font-medium text-black">{{ program.totalApplicants }}</p>
                </div>
                <div class="transition-all duration-300 group-hover:scale-105">
                  <p class="text-xs text-black/50">Completed</p>
                  <p class="font-medium text-black">{{ program.totalCompleted }}</p>
                </div>
                <div class="transition-all duration-300 group-hover:scale-105">
                  <p class="text-xs text-black/50">Certified</p>
                  <p class="font-medium" style="color: #cf39da;">{{ program.totalCertified }}</p>
                </div>
              </div>
              <!-- Hover indicator -->
              <div class="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl transition-all duration-300 group-hover:h-1" style="background: linear-gradient(90deg, #ff0000, #cf39da, #b355c0); opacity: 0; group-hover:opacity-100;"></div>
            </a>
          }
        </div>
      }
    </div>

    @if (panelOpen()) {
      <div class="fixed inset-0 z-40 animate-fade-up" style="background: rgba(0, 0, 0, 0.3); backdrop-filter: blur(4px);" (click)="panelOpen.set(false)"></div>
      <div class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto animate-slide-in" style="border-left: 3px solid transparent; border-image: linear-gradient(180deg, #ff0000, #cf39da, #b355c0) 1;">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-display text-lg font-medium text-black">New program</h2>
          <button type="button" (click)="panelOpen.set(false)" class="material-icons transition-all duration-300 hover:rotate-90 text-black/50 hover:text-black">close</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-black/80 mb-1.5">Program name</label>
            <input formControlName="name" class="w-full rounded-xl border px-3 py-2.5 text-sm text-black transition-all duration-300 focus:outline-none" style="border-color: #b355c020; background: white;" placeholder="Data Analytics Short Course" />
          </div>
          <div>
            <label class="block text-sm font-medium text-black/80 mb-1.5">Type</label>
            <select formControlName="type" class="w-full rounded-xl border px-3 py-2.5 text-sm text-black transition-all duration-300 focus:outline-none" style="border-color: #b355c020; background: white;">
              <option value="SHORT_COURSE">Short course</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="ATTACHMENT">Attachment</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-black/80 mb-1.5">Cohort label</label>
            <input formControlName="cohortLabel" class="w-full rounded-xl border px-3 py-2.5 text-sm text-black transition-all duration-300 focus:outline-none" style="border-color: #b355c020; background: white;" placeholder="Jan 2026 intake" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-black/80 mb-1.5">Start date</label>
              <input type="date" formControlName="startDate" class="w-full rounded-xl border px-3 py-2.5 text-sm text-black transition-all duration-300 focus:outline-none" style="border-color: #b355c020; background: white;" />
            </div>
            <div>
              <label class="block text-sm font-medium text-black/80 mb-1.5">End date</label>
              <input type="date" formControlName="endDate" class="w-full rounded-xl border px-3 py-2.5 text-sm text-black transition-all duration-300 focus:outline-none" style="border-color: #b355c020; background: white;" />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="form.invalid || submitting()"
            class="w-full rounded-xl text-white text-sm font-medium py-2.5 transition-all duration-300 relative overflow-hidden group"
            style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);"
            [style.opacity]="form.invalid || submitting() ? '0.5' : '1'"
            [style.transform]="form.invalid || submitting() ? 'scale(0.98)' : 'scale(1)'"
          >
            <span class="relative z-10 flex items-center justify-center gap-2">
              @if (submitting()) {
                <span class="material-icons text-base animate-spin">progress_activity</span>
              }
              {{ submitting() ? 'Creating...' : 'Create program' }}
            </span>
            <span class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" [style.opacity]="form.invalid || submitting() ? '0' : ''"></span>
            <span class="absolute inset-0 transition-all duration-500" style="background: linear-gradient(135deg, #b355c0, #cf39da, #ff0000); opacity: 0;" [style.opacity]="form.invalid || submitting() ? '0' : ''"></span>
            @if (!submitting() && !form.invalid) {
              <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);"></div>
            }
          </button>
        </form>
      </div>
    }
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

    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateX(30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .animate-fade-up {
      animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }

    .animate-slide-in {
      animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }

    .shadow-card {
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
    }

    /* Input focus states */
    input:focus, select:focus {
      border-color: #cf39da !important;
      box-shadow: 0 0 0 4px #b355c020 !important;
    }

    input:hover, select:hover {
      border-color: #b355c060 !important;
    }

    input::placeholder {
      color: #b355c040;
    }

    input:focus::placeholder {
      color: #b355c080;
    }

    /* Scrollbar for panel */
    .overflow-y-auto::-webkit-scrollbar {
      width: 4px;
    }
    .overflow-y-auto::-webkit-scrollbar-track {
      background: #b355c004;
      border-radius: 2px;
    }
    .overflow-y-auto::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #ff0000, #cf39da, #b355c0);
      border-radius: 2px;
    }

    @media (max-width: 640px) {
      .animate-fade-up {
        animation-duration: 0.4s;
      }
      
      header {
        flex-direction: column;
        gap: 1rem;
      }
      
      header button {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class ProgramsComponent implements OnInit {
  private readonly programsService = inject(ProgramsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly panelOpen = signal(false);
  protected readonly programs = signal<ProgramWithCounts[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['SHORT_COURSE' as ProgramType, Validators.required],
    cohortLabel: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
  });

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.programsService.list().subscribe({
      next: (programs) => {
        this.programs.set(programs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const value = this.form.getRawValue();

    this.programsService.create(value).subscribe({
      next: () => {
        this.toast.success('Program created', `${value.name} is now open for applicants`);
        this.submitting.set(false);
        this.panelOpen.set(false);
        this.form.reset({ type: 'SHORT_COURSE' as ProgramType });
        this.fetch();
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error('Could not create program', 'Check the form and try again');
      },
    });
  }

  protected typeLabel(type: ProgramType): string {
    return type.replace('_', ' ');
  }

  protected typeTone(type: ProgramType): BadgeTone {
    return TYPE_TONE[type];
  }
}