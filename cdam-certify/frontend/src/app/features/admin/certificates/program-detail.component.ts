import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EnrollmentRow, EnrollmentsService } from '../../../core/services/enrollments.service';
import { ImportService } from '../../../core/services/import.service';
import { CertificatesService } from '../../../core/services/certificates.service';
import { ProgramsService } from '../../../core/services/programs.service';
import { ToastService } from '../../../core/services/toast.service';
import { Program } from '../../../core/models/program.model';
import { EnrollmentStatus } from '../../../core/models/enums';
import { BadgeComponent, BadgeTone } from '../../../shared/components/badge/badge.component';
import { SkeletonRowsComponent } from '../../../shared/components/skeleton/skeleton-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

const STATUS_TONE: Record<EnrollmentStatus, BadgeTone> = {
  [EnrollmentStatus.APPLIED]: 'sand',
  [EnrollmentStatus.ENROLLED]: 'clay',
  [EnrollmentStatus.COMPLETED]: 'emerald',
  [EnrollmentStatus.WITHDRAWN]: 'red',
};

@Component({
  selector: 'app-program-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, SkeletonRowsComponent, EmptyStateComponent],
  template: `
    <div class="max-w-7xl mx-auto px-8 py-8">
      @if (program(); as program) {
        <header class="mb-8 flex items-start justify-between animate-fade-up">
          <div>
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-semibold text-lg transition-transform duration-500 hover:scale-110" 
                   style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);">
                {{ program.name.charAt(0) }}
              </div>
              <div>
                <h1 class="font-display text-2xl font-semibold" style="color: #cf39da;">{{ program.name }}</h1>
                <p class="text-sm mt-0.5" style="color: #b355c0;">{{ program.cohortLabel }} &middot; {{ program.type.replace('_', ' ') }}</p>
              </div>
            </div>
          </div>
          <div class="flex gap-2.5">
            <button
              type="button"
              (click)="fileInput.click()"
              [disabled]="importing()"
              class="inline-flex items-center gap-1.5 rounded-xl text-sm font-medium px-4 py-2.5 transition-all duration-300 relative overflow-hidden group"
              style="background: white; border: 1px solid #b355c040; color: #cf39da;"
              [style.opacity]="importing() ? '0.5' : '1'"
            >
              <span class="relative z-10 flex items-center gap-1.5">
                @if (importing()) {
                  <span class="material-icons text-[18px] animate-spin" style="color: #cf39da;">progress_activity</span>
                } @else {
                  <span class="material-icons text-[18px]" style="color: #b355c0;">upload_file</span>
                }
                Import from Sheet
              </span>
              <span class="absolute inset-0 transition-all duration-300" style="background: #b355c010; opacity: 0;" [style.opacity]="importing() ? '0' : 'group-hover:opacity-100'"></span>
            </button>
            <input #fileInput type="file" accept=".csv" class="hidden" (change)="onFileSelected($event)" />

            <button
              type="button"
              (click)="issueSelected()"
              [disabled]="selectedIds().length === 0 || issuing()"
              class="inline-flex items-center gap-1.5 rounded-xl text-white text-sm font-medium px-4 py-2.5 transition-all duration-300 relative overflow-hidden group"
              style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);"
              [style.opacity]="selectedIds().length === 0 || issuing() ? '0.4' : '1'"
              [style.transform]="selectedIds().length === 0 || issuing() ? 'scale(0.98)' : 'scale(1)'"
            >
              <span class="relative z-10 flex items-center gap-1.5">
                <span class="material-icons text-[18px]">workspace_premium</span>
                Issue {{ selectedIds().length || '' }} certificate{{ selectedIds().length === 1 ? '' : 's' }}
              </span>
              <span class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" [style.opacity]="selectedIds().length === 0 || issuing() ? '0' : ''"></span>
              <span class="absolute inset-0 transition-all duration-500" style="background: linear-gradient(135deg, #b355c0, #cf39da, #ff0000); opacity: 0;" [style.opacity]="selectedIds().length === 0 || issuing() ? '0' : ''"></span>
              @if (selectedIds().length > 0 && !issuing()) {
                <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);"></div>
              }
            </button>
          </div>
        </header>

        @if (loading()) {
          <div class="animate-fade-up" style="animation-delay: 100ms;">
            <app-skeleton-rows [rows]="6" />
          </div>
        } @else if (enrollments().length === 0) {
          <div class="animate-fade-up" style="animation-delay: 100ms;">
            <app-empty-state icon="upload_file" title="No applicants yet" description="Import your Google Sheet export to bring in applicants for this cohort." />
          </div>
        } @else {
          <div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-card overflow-hidden transition-all duration-300 hover:shadow-xl animate-fade-up" 
               style="animation-delay: 100ms; border: 1px solid #b355c020;">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase tracking-wide" style="color: #cf39da; background: linear-gradient(135deg, #b355c008, #ff000008);">
                    <th class="px-5 py-4 w-10">
                      <input
                        type="checkbox"
                        [checked]="allSelected()"
                        (change)="toggleAll($event)"
                        [disabled]="!hasSelectableEnrollments()"
                        class="rounded transition-all duration-300"
                        style="border-color: #b355c040; accent-color: #ff0000;"
                      />
                    </th>
                    <th class="px-5 py-4 font-semibold">Student</th>
                    <th class="px-5 py-4 font-semibold">Status</th>
                    <th class="px-5 py-4 font-semibold">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  @for (enrollment of enrollments(); track enrollment.id; let idx = $index) {
                    <tr class="border-t transition-all duration-300" 
                        style="border-color: #b355c010;"
                        [style.animation-delay]="(idx * 50) + 'ms'"
                        [class]="idx % 2 === 0 ? 'bg-white' : 'bg-[#b355c004]'"
                        [class.hover-scale]="enrollment.status === 'COMPLETED' && !enrollment.certificate">
                      <td class="px-5 py-4">
                        <input
                          type="checkbox"
                          [disabled]="enrollment.status !== 'COMPLETED' || !!enrollment.certificate"
                          [checked]="isSelected(enrollment.id)"
                          (change)="toggleSelect(enrollment.id)"
                          class="rounded transition-all duration-300"
                          style="border-color: #b355c040; accent-color: #ff0000;"
                          [style.opacity]="enrollment.status !== 'COMPLETED' || !!enrollment.certificate ? '0.3' : '1'"
                          [style.cursor]="enrollment.status !== 'COMPLETED' || !!enrollment.certificate ? 'not-allowed' : 'pointer'"
                        />
                      </td>
                      <td class="px-5 py-4">
                        <p class="font-medium" style="color: #cf39da;">{{ enrollment.student.fullName }}</p>
                        <p class="text-xs mt-0.5" style="color: #b355c0;">{{ enrollment.student.email }}</p>
                      </td>
                      <td class="px-5 py-4">
                        <select
                          [ngModel]="enrollment.status"
                          (ngModelChange)="updateStatus(enrollment, $event)"
                          class="text-xs rounded-full border-0 font-medium px-2.5 py-1 focus:outline-none transition-all duration-300 cursor-pointer"
                          [ngClass]="badgeBg(enrollment.status)"
                          [style.border]="'1px solid ' + getStatusColor(enrollment.status) + '20'"
                        >
                          <option value="APPLIED">Applied</option>
                          <option value="ENROLLED">Enrolled</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="WITHDRAWN">Withdrawn</option>
                        </select>
                      </td>
                      <td class="px-5 py-4">
                        @if (enrollment.certificate) {
                          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105"
                                style="background: linear-gradient(135deg, #ff000008, #b355c008); color: #ff0000; border: 1px solid #b355c020;">
                            <span class="material-icons text-[14px]" style="color: #cf39da;">verified</span>
                            {{ enrollment.certificate.certId }}
                          </span>
                        } @else {
                          <span class="text-xs" style="color: #b355c080;">
                            <span class="material-icons text-[14px] align-middle mr-0.5" style="color: #b355c040;">pending</span>
                            Not issued
                          </span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            
            <!-- Footer with stats -->
            <div class="px-5 py-3 border-t flex items-center justify-between" style="border-color: #b355c010; background: linear-gradient(135deg, #b355c004, #ff000004);">
              <div class="flex items-center gap-4 text-xs" style="color: #b355c080;">
                <span>{{ enrollments().length }} total</span>
                <span class="h-3 w-px" style="background: #b355c020;"></span>
                <span style="color: #ff0000;">{{ getCompletedCount() }} completed</span>
                <span class="h-3 w-px" style="background: #b355c020;"></span>
                <span style="color: #cf39da;">{{ getIssuedCount() }} issued</span>
              </div>
              <span class="text-xs" style="color: #b355c080;">Selected: {{ selectedIds().length }}</span>
            </div>
          </div>
        }
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
      box-shadow: 0 4px 24px rgba(207, 57, 218, 0.06), 0 1px 4px rgba(255, 0, 0, 0.04);
    }

    /* Table row hover effect */
    tbody tr {
      position: relative;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    tbody tr:hover {
      background: #b355c004 !important;
    }

    .hover-scale:hover {
      transform: scale(1.002);
      box-shadow: 0 2px 8px rgba(255, 0, 0, 0.04);
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

    /* Custom checkbox styling */
    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      transition: all 0.3s;
    }

    input[type="checkbox"]:checked {
      background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);
      border-color: #cf39da;
    }

    input[type="checkbox"]:focus {
      box-shadow: 0 0 0 3px #b355c020;
    }

    /* Status select styling */
    select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23cf39da' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      padding-right: 28px;
      cursor: pointer;
      transition: all 0.3s;
    }

    select:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(207, 57, 218, 0.1);
    }

    select:focus {
      box-shadow: 0 0 0 3px #b355c020;
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
        flex-wrap: wrap;
      }
      
      button {
        flex: 1;
        justify-content: center;
        font-size: 0.75rem;
        padding: 0.5rem 0.75rem;
      }
    }

    @media (max-width: 640px) {
      .animate-fade-up {
        animation-duration: 0.4s;
      }
    }
  `]
})
export class ProgramDetailComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly programsService = inject(ProgramsService);
  private readonly enrollmentsService = inject(EnrollmentsService);
  private readonly importService = inject(ImportService);
  private readonly certificatesService = inject(CertificatesService);
  private readonly toast = inject(ToastService);

  private readonly programId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly program = signal<Program | null>(null);
  protected readonly enrollments = signal<EnrollmentRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly importing = signal(false);
  protected readonly issuing = signal(false);
  protected readonly selectedIds = signal<string[]>([]);

  ngOnInit(): void {
    this.programsService.get(this.programId).subscribe((program) => this.program.set(program));
    this.fetchEnrollments();
  }

  private fetchEnrollments(): void {
    this.loading.set(true);
    this.enrollmentsService.byProgram(this.programId).subscribe({
      next: (rows) => {
        this.enrollments.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importing.set(true);
    this.importService.importStudents(this.programId, file).subscribe({
      next: (result) => {
        this.importing.set(false);
        input.value = '';
        this.toast.success(
          `${result.imported} students imported`,
          result.skippedDuplicates
            ? `${result.skippedDuplicates} were already enrolled and skipped`
            : `From ${result.totalRows} rows in the sheet`,
        );
        this.fetchEnrollments();
      },
      error: () => {
        this.importing.set(false);
        this.toast.error('Import failed', 'Check the CSV format and try again');
      },
    });
  }

  protected updateStatus(enrollment: EnrollmentRow, status: EnrollmentStatus): void {
    this.enrollmentsService.updateStatus(enrollment.id, status).subscribe({
      next: () => {
        this.toast.success('Status updated', `${enrollment.student.fullName} marked as ${status.toLowerCase()}`);
        this.fetchEnrollments();
      },
      error: () => this.toast.error('Could not update status'),
    });
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  protected toggleSelect(id: string): void {
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  protected allSelected(): boolean {
    const selectable = this.getSelectableEnrollments();
    return selectable.length > 0 && selectable.every(e => this.selectedIds().includes(e.id));
  }

  protected hasSelectableEnrollments(): boolean {
    return this.getSelectableEnrollments().length > 0;
  }

  private getSelectableEnrollments(): EnrollmentRow[] {
    return this.enrollments().filter(e => e.status === 'COMPLETED' && !e.certificate);
  }

  protected toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selectableIds = this.getSelectableEnrollments().map(e => e.id);
    
    if (checked) {
      this.selectedIds.set([...new Set([...this.selectedIds(), ...selectableIds])]);
    } else {
      this.selectedIds.set(this.selectedIds().filter(id => !selectableIds.includes(id)));
    }
  }

  protected issueSelected(): void {
    const ids = this.selectedIds();
    if (ids.length === 0) return;

    this.issuing.set(true);
    this.certificatesService.issueBulk(ids).subscribe({
      next: (result) => {
        this.issuing.set(false);
        this.selectedIds.set([]);
        this.toast.success(`${result.queued} certificate${result.queued === 1 ? '' : 's'} queued`, 'They will be emailed automatically once generated');
        setTimeout(() => this.fetchEnrollments(), 1500);
      },
      error: () => {
        this.issuing.set(false);
        this.toast.error('Could not queue certificates');
      },
    });
  }

  protected getCompletedCount(): number {
    return this.enrollments().filter(e => e.status === 'COMPLETED').length;
  }

  protected getIssuedCount(): number {
    return this.enrollments().filter(e => e.certificate).length;
  }

  protected badgeBg(status: EnrollmentStatus): string {
    const tone = STATUS_TONE[status];
    const map: Record<BadgeTone, string> = {
      emerald: 'bg-emerald-50 text-emerald-800',
      clay: 'bg-clay-50 text-clay-800',
      sand: 'bg-sand-100 text-sand-800',
      red: 'bg-red-50 text-red-800',
    };
    return map[tone];
  }

  protected getStatusColor(status: EnrollmentStatus): string {
    const colors: Record<EnrollmentStatus, string> = {
      [EnrollmentStatus.APPLIED]: '#b355c0',
      [EnrollmentStatus.ENROLLED]: '#cf39da',
      [EnrollmentStatus.COMPLETED]: '#ff0000',
      [EnrollmentStatus.WITHDRAWN]: '#ff0000',
    };
    return colors[status] || '#cf39da';
  }
}