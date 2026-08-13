import { Component, ElementRef, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
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
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      @if (program(); as program) {
        <header class="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-up">
          <div class="flex items-center gap-3 min-w-0">
            <div class="avatar-badge">{{ program.name.charAt(0) }}</div>
            <div class="min-w-0">
              <h1 class="font-display text-xl sm:text-2xl font-semibold text-ink truncate">{{ program.name }}</h1>
              <p class="text-sm text-sand-600 mt-0.5">{{ program.cohortLabel }} &middot; {{ program.type.replace('_', ' ') }}</p>
            </div>
          </div>

          <div class="flex gap-2.5">
            <button
              type="button"
              (click)="fileInput.click()"
              [disabled]="importing()"
              class="action-btn action-btn--ghost"
            >
              @if (importing()) {
                <span class="material-icons text-[18px] spin">progress_activity</span>
              } @else {
                <span class="material-icons text-[18px]">upload_file</span>
              }
              <span class="hidden xs:inline">Import from Sheet</span>
              <span class="xs:hidden">Import</span>
            </button>
            <input #fileInput type="file" accept=".csv" class="sr-only" (change)="onFileSelected($event)" />

            <button
              type="button"
              (click)="issueSelected()"
              [disabled]="selectedIds().length === 0 || issuing()"
              class="action-btn action-btn--solid"
            >
              @if (issuing()) {
                <span class="material-icons text-[18px] spin">progress_activity</span>
              } @else {
                <span class="material-icons text-[18px]">workspace_premium</span>
              }
              Issue {{ selectedIds().length || '' }} certificate{{ selectedIds().length === 1 ? '' : 's' }}
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
          <div class="panel animate-fade-up" style="animation-delay: 100ms;">
            <!-- Desktop / tablet: table -->
            <div class="hidden sm:block overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase tracking-wide text-sand-600 bg-sand-50">
                    <th class="px-5 py-4 w-10">
                      <input
                        type="checkbox"
                        [checked]="allSelected()"
                        (change)="toggleAll($event)"
                        [disabled]="!hasSelectableEnrollments()"
                        aria-label="Select all eligible enrollments"
                        class="row-checkbox"
                      />
                    </th>
                    <th class="px-5 py-4 font-medium text-ink">Student</th>
                    <th class="px-5 py-4 font-medium text-ink">Status</th>
                    <th class="px-5 py-4 font-medium text-ink">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  @for (enrollment of enrollments(); track enrollment.id; let idx = $index) {
                    <tr
                      class="cohort-row"
                      [class]="idx % 2 === 0 ? 'bg-white' : 'row-alt'"
                      [style.animation-delay]="(idx * 40) + 'ms'"
                    >
                      <td class="px-5 py-4">
                        <input
                          type="checkbox"
                          [disabled]="enrollment.status !== 'COMPLETED' || !!enrollment.certificate"
                          [checked]="isSelected(enrollment.id)"
                          (change)="toggleSelect(enrollment.id)"
                          [attr.aria-label]="'Select ' + enrollment.student.fullName + ' for certificate issuance'"
                          class="row-checkbox"
                        />
                      </td>
                      <td class="px-5 py-4">
                        <p class="font-medium text-ink">{{ enrollment.student.fullName }}</p>
                        <p class="text-xs text-sand-600 mt-0.5">{{ enrollment.student.email }}</p>
                      </td>
                      <td class="px-5 py-4">
                        <select
                          [ngModel]="enrollment.status"
                          (ngModelChange)="updateStatus(enrollment, $event)"
                          class="status-select"
                          [class]="statusSelectClass(enrollment.status)"
                        >
                          <option value="APPLIED">Applied</option>
                          <option value="ENROLLED">Enrolled</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="WITHDRAWN">Withdrawn</option>
                        </select>
                      </td>
                      <td class="px-5 py-4">
                        @if (enrollment.certificate) {
                          <span class="cert-pill">
                            <span class="material-icons text-[14px] text-emerald-600">verified</span>
                            {{ enrollment.certificate.certId }}
                          </span>
                        } @else {
                          <span class="cert-pending">
                            <span class="material-icons text-[14px]">pending</span>
                            Not issued
                          </span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile: stacked cards -->
            <div class="sm:hidden divide-y divide-sand-100">
              @for (enrollment of enrollments(); track enrollment.id; let idx = $index) {
                <div class="enrollment-card" [style.animation-delay]="(idx * 40) + 'ms'">
                  <div class="flex items-start gap-3">
                    <input
                      type="checkbox"
                      [disabled]="enrollment.status !== 'COMPLETED' || !!enrollment.certificate"
                      [checked]="isSelected(enrollment.id)"
                      (change)="toggleSelect(enrollment.id)"
                      [attr.aria-label]="'Select ' + enrollment.student.fullName + ' for certificate issuance'"
                      class="row-checkbox mt-1"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-ink truncate">{{ enrollment.student.fullName }}</p>
                      <p class="text-xs text-sand-600 mt-0.5 truncate">{{ enrollment.student.email }}</p>
                      <div class="flex items-center justify-between gap-2 mt-3">
                        <select
                          [ngModel]="enrollment.status"
                          (ngModelChange)="updateStatus(enrollment, $event)"
                          class="status-select"
                          [class]="statusSelectClass(enrollment.status)"
                        >
                          <option value="APPLIED">Applied</option>
                          <option value="ENROLLED">Enrolled</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="WITHDRAWN">Withdrawn</option>
                        </select>

                        @if (enrollment.certificate) {
                          <span class="cert-pill">
                            <span class="material-icons text-[14px] text-emerald-600">verified</span>
                            {{ enrollment.certificate.certId }}
                          </span>
                        } @else {
                          <span class="cert-pending">
                            <span class="material-icons text-[14px]">pending</span>
                            Not issued
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Footer with stats -->
            <div class="panel-footer">
              <div class="flex items-center gap-4 text-xs text-sand-600">
                <span>{{ enrollments().length }} total</span>
                <span class="divider"></span>
                <span class="text-emerald-700">{{ getCompletedCount() }} completed</span>
                <span class="divider"></span>
                <span class="text-clay-700">{{ getIssuedCount() }} issued</span>
              </div>
              <span class="text-xs text-sand-500">Selected: {{ selectedIds().length }}</span>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .font-display { font-family: system-ui, -apple-system, sans-serif; }

    /* ---------- Motion ---------- */
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .animate-fade-up {
      animation: fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both;
      opacity: 0;
    }
    .spin { display: inline-block; animation: spin 0.9s linear infinite; }

    /* ---------- Header ---------- */
    .avatar-badge {
      height: 3rem;
      width: 3rem;
      flex-shrink: 0;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 600;
      font-size: 1.125rem;
      background: #059669;
      transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
    }
    .avatar-badge:hover { transform: scale(1.1); }

    /* ---------- Buttons ---------- */
    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.625rem 1rem;
      white-space: nowrap;
      transition: background-color 0.2s, transform 0.15s, box-shadow 0.2s, opacity 0.2s;
    }
    .action-btn:active:not(:disabled) { transform: scale(0.98); }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .action-btn--ghost {
      border: 1px solid #e7e0d6;
      background: #fff;
      color: #1c1917;
    }
    .action-btn--ghost:hover:not(:disabled) { background: #f5f0e8; }

    .action-btn--solid {
      background: #059669;
      color: #fff;
    }
    .action-btn--solid:hover:not(:disabled) {
      background: #065f46;
      box-shadow: 0 6px 16px rgba(5,150,105,0.25);
    }

    /* ---------- Panel ---------- */
    .panel {
      background: #fff;
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
      border: 1px solid #f0ebe3;
      transition: box-shadow 0.3s;
    }
    .panel:hover { box-shadow: 0 10px 28px rgba(0,0,0,0.08); }

    .panel-footer {
      padding: 0.75rem 1.25rem;
      border-top: 1px solid #f0ebe3;
      background: rgba(245,240,232,0.5);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    @media (min-width: 640px) {
      .panel-footer { flex-direction: row; align-items: center; justify-content: space-between; }
    }
    .divider { height: 0.75rem; width: 1px; background: #e7e0d6; display: inline-block; }

    /* ---------- Rows ---------- */
    .cohort-row {
      border-top: 1px solid #f5f0ea;
      transition: background 0.3s cubic-bezier(0.16,1,0.3,1);
      animation: fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both;
    }
    .cohort-row.row-alt { background: rgba(245,240,232,0.5); }
    .cohort-row:hover { background: #f5f0e8; }

    .enrollment-card {
      padding: 1rem 1.25rem;
      animation: fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both;
      transition: background 0.2s;
    }
    .enrollment-card:active { background: #f5f0e8; }

    /* ---------- Checkbox ---------- */
    .row-checkbox {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #059669;
      transition: transform 0.15s;
    }
    .row-checkbox:disabled { opacity: 0.3; cursor: not-allowed; }
    .row-checkbox:not(:disabled):hover { transform: scale(1.1); }
    .row-checkbox:focus-visible {
      outline: 2px solid #059669;
      outline-offset: 2px;
    }

    /* ---------- Status select ---------- */
    .status-select {
      appearance: none;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
      border: 1px solid transparent;
      padding: 0.25rem 1.75rem 0.25rem 0.75rem;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2378716c' d='M5 7L1 3h8z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      transition: box-shadow 0.2s, transform 0.15s;
    }
    .status-select:hover { transform: scale(1.03); }
    .status-select:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(5,150,105,0.15);
    }
    .status-select--applied { background-color: #f5f0e8; color: #78716c; border-color: #e7e0d6; }
    .status-select--enrolled { background-color: #f5f0e8; color: #57534e; border-color: #d9cfc0; }
    .status-select--completed { background-color: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .status-select--withdrawn { background-color: #fef2f2; color: #991b1b; border-color: #fecaca; }

    /* ---------- Certificate pills ---------- */
    .cert-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 500;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid rgba(167,243,208,0.5);
      transition: transform 0.2s;
    }
    .cert-pill:hover { transform: scale(1.05); }
    .cert-pending {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.72rem;
      color: #a8a29e;
    }

    /* ---------- Scrollbar ---------- */
    .overflow-x-auto::-webkit-scrollbar { height: 6px; }
    .overflow-x-auto::-webkit-scrollbar-track { background: #f5f0e8; border-radius: 3px; }
    .overflow-x-auto::-webkit-scrollbar-thumb { background: #d9cfc0; border-radius: 3px; }
    .overflow-x-auto::-webkit-scrollbar-thumb:hover { background: #c4b8a8; }

    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 768px) {
      td, th { padding: 0.75rem !important; }
    }
    @media (max-width: 380px) {
      .xs\\:hidden { display: none; }
    }
    @media (min-width: 380px) {
      .xs\\:inline { display: inline; }
    }

    /* ---------- Reduced motion ---------- */
    @media (prefers-reduced-motion: reduce) {
      .animate-fade-up, .spin, .cohort-row, .enrollment-card, .avatar-badge {
        animation: none !important;
        transition: none !important;
        opacity: 1 !important;
        transform: none !important;
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

  protected readonly completedCount = computed(
    () => this.enrollments().filter((e) => e.status === 'COMPLETED').length,
  );
  protected readonly issuedCount = computed(
    () => this.enrollments().filter((e) => !!e.certificate).length,
  );

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
    return selectable.length > 0 && selectable.every((e) => this.selectedIds().includes(e.id));
  }

  protected hasSelectableEnrollments(): boolean {
    return this.getSelectableEnrollments().length > 0;
  }

  private getSelectableEnrollments(): EnrollmentRow[] {
    return this.enrollments().filter((e) => e.status === 'COMPLETED' && !e.certificate);
  }

  protected toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selectableIds = this.getSelectableEnrollments().map((e) => e.id);

    if (checked) {
      this.selectedIds.set([...new Set([...this.selectedIds(), ...selectableIds])]);
    } else {
      this.selectedIds.set(this.selectedIds().filter((id) => !selectableIds.includes(id)));
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
    return this.completedCount();
  }

  protected getIssuedCount(): number {
    return this.issuedCount();
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

  protected statusSelectClass(status: EnrollmentStatus): string {
    const map: Record<EnrollmentStatus, string> = {
      APPLIED: 'status-select--applied',
      ENROLLED: 'status-select--enrolled',
      COMPLETED: 'status-select--completed',
      WITHDRAWN: 'status-select--withdrawn',
    } as Record<EnrollmentStatus, string>;
    return map[status] ?? 'status-select--applied';
  }
}