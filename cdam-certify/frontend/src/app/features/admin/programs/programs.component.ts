import { Component, OnInit, inject, signal, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProgramsService } from '../../../core/services/programs.service';
import { ImportService } from '../../../core/services/import.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProgramWithCounts } from '../../../core/models/program.model';
import { ProgramType } from '../../../core/models/enums';
import { DomainImportResult } from '../../../core/models/import-result.model';
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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, BadgeComponent, SkeletonRowsComponent, EmptyStateComponent],
  template: `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header class="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 class="font-display text-2xl font-semibold text-ink">Programs</h1>
          <p class="text-sm text-sand-600 mt-1">Short courses, internships, and attachments run by CDAM.</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            (click)="domainImportOpen.set(true)"
            class="action-btn action-btn--ghost"
          >
            <span class="material-icons text-[18px]">upload_file</span>
            Bulk Upload Domains
          </button>
          <button
            type="button"
            (click)="openPanel()"
            class="action-btn action-btn--solid"
          >
            <span class="material-icons text-[18px]">add</span>
            New program
          </button>
        </div>
      </header>

      @if (loading()) {
        <app-skeleton-rows [rows]="4" />
      } @else if (programs().length === 0) {
        <div class="animate-fade-up">
          <app-empty-state icon="school" title="No programs yet" description="Create your first cohort to get started." />
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (program of programs(); track program.id; let i = $index) {
            <a
              [routerLink]="['/admin/programs', program.id]"
              class="program-card animate-fade-up block"
              [style.animation-delay.ms]="i * 45"
            >
              <div class="flex items-center justify-between mb-3">
                <app-badge [tone]="typeTone(program.type)">{{ typeLabel(program.type) }}</app-badge>
                @if (!program.isActive) {
                  <app-badge tone="sand">Archived</app-badge>
                }
              </div>
              <h3 class="font-display text-base font-medium text-ink leading-snug">{{ program.name }}</h3>
              <p class="text-xs text-sand-400 mt-1">{{ program.cohortLabel ?? 'No cohort label' }}</p>
              <div class="flex items-center gap-4 mt-4 pt-4 border-t border-sand-100 text-sm">
                <div>
                  <p class="text-sand-400 text-xs">Applicants</p>
                  <p class="font-medium text-ink tabular-nums">{{ program.totalApplicants }}</p>
                </div>
                <div>
                  <p class="text-sand-400 text-xs">Completed</p>
                  <p class="font-medium text-ink tabular-nums">{{ program.totalCompleted }}</p>
                </div>
                <div>
                  <p class="text-sand-400 text-xs">Certified</p>
                  <p class="font-medium text-emerald-600 tabular-nums">{{ program.totalCertified }}</p>
                </div>
              </div>
            </a>
          }
        </div>
      }
    </div>

    <!-- New program side panel -->
    @if (panelOpen()) {
      <div class="backdrop" (click)="panelOpen.set(false)"></div>
      <div
        class="side-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-program-title"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 id="new-program-title" class="font-display text-lg font-medium text-ink">New program</h2>
          <button type="button" (click)="panelOpen.set(false)" aria-label="Close" class="close-btn material-icons">close</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-ink mb-1.5">Program name</label>
            <input #firstField formControlName="name" class="field-input" placeholder="Data Analytics Short Course" />
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <p class="field-error">Program name is required.</p>
            }
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1.5">Type</label>
            <select formControlName="type" class="field-input">
              <option value="SHORT_COURSE">Short course</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="ATTACHMENT">Attachment</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1.5">Cohort label</label>
            <input formControlName="cohortLabel" class="field-input" placeholder="Jan 2026 intake" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-ink mb-1.5">Start date</label>
              <input type="date" formControlName="startDate" class="field-input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink mb-1.5">End date</label>
              <input type="date" formControlName="endDate" class="field-input" />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="form.invalid || submitting()"
            class="submit-btn"
          >
            @if (submitting()) {
              <span class="material-icons text-[18px] spin">progress_activity</span>
              Creating&hellip;
            } @else {
              Create program
            }
          </button>
        </form>
      </div>
    }

    <!-- Domain import modal -->
    @if (domainImportOpen()) {
      <div class="backdrop" (click)="closeDomainImport()"></div>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="center-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
          <div class="flex items-center justify-between mb-1">
            <h2 id="import-title" class="font-display text-lg font-medium text-ink">Import multi-domain sheet</h2>
            <button type="button" (click)="closeDomainImport()" aria-label="Close" class="close-btn material-icons">close</button>
          </div>
          <p class="text-sm text-sand-600 mb-5">
            For sheets with a <span class="font-medium text-ink">Domain</span> column spanning several cohorts &mdash;
            each distinct domain becomes its own program automatically.
          </p>

          @if (!domainImportResult()) {
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-ink mb-1.5">Program type</label>
                <select [(ngModel)]="domainImportType" class="field-input">
                  <option value="INTERNSHIP">Internship</option>
                  <option value="SHORT_COURSE">Short course</option>
                  <option value="ATTACHMENT">Attachment</option>
                </select>
                <p class="text-xs text-sand-400 mt-1">Every domain found in the sheet is created under this type.</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-ink mb-1.5">CSV file</label>
                <label
                  class="drop-zone"
                  [class.drop-zone--active]="dragActive()"
                  [class.drop-zone--filled]="!!selectedFileName()"
                  (dragover)="onDragOver($event)"
                  (dragleave)="dragActive.set(false)"
                  (drop)="onDrop($event)"
                >
                  <input
                    #domainFileInput
                    type="file"
                    accept=".csv"
                    (change)="onDomainFileSelected($event)"
                    class="sr-only"
                  />
                  <span class="material-icons text-[22px]" [class.text-emerald-600]="!!selectedFileName()">
                    {{ selectedFileName() ? 'task' : 'cloud_upload' }}
                  </span>
                  <span class="text-sm font-medium text-ink mt-1.5">
                    {{ selectedFileName() ?? 'Drop CSV here, or click to browse' }}
                  </span>
                  <span class="text-xs text-sand-400 mt-0.5">Export from Google Sheets: File &rarr; Download &rarr; CSV</span>
                </label>
              </div>

              @if (domainImporting()) {
                <div class="flex items-center gap-2 text-sm text-sand-600 animate-fade-up">
                  <span class="material-icons text-[18px] spin">progress_activity</span>
                  Importing&hellip;
                </div>
              }
            </div>
          } @else {
            <div class="space-y-3 animate-fade-up">
              <div class="rounded-xl bg-emerald-50 px-4 py-3">
                <p class="text-sm font-medium text-emerald-800">{{ domainImportResult()!.imported }} students imported</p>
                <p class="text-xs text-emerald-800/70 mt-0.5">
                  {{ domainImportResult()!.skippedDuplicates }} already enrolled and skipped &middot;
                  {{ domainImportResult()!.errors.length }} row error{{ domainImportResult()!.errors.length === 1 ? '' : 's' }}
                </p>
              </div>

              @if (domainImportResult()!.programsCreated.length > 0) {
                <div>
                  <p class="text-xs text-sand-400 uppercase tracking-wide mb-1.5">New programs created</p>
                  <div class="flex flex-wrap gap-1.5">
                    @for (name of domainImportResult()!.programsCreated; track name) {
                      <app-badge tone="clay">{{ name }}</app-badge>
                    }
                  </div>
                  <p class="text-xs text-sand-400 mt-1.5">Review their start/end dates on the Programs page &mdash; they default to a 90-day placeholder window.</p>
                </div>
              }

              @if (domainImportResult()!.programsMatched.length > 0) {
                <div>
                  <p class="text-xs text-sand-400 uppercase tracking-wide mb-1.5">Matched existing programs</p>
                  <div class="flex flex-wrap gap-1.5">
                    @for (name of domainImportResult()!.programsMatched; track name) {
                      <app-badge tone="emerald">{{ name }}</app-badge>
                    }
                  </div>
                </div>
              }

              <button type="button" (click)="closeDomainImport()" class="submit-btn mt-2">
                Done
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .tabular-nums { font-variant-numeric: tabular-nums; }

    /* ---------- Motion ---------- */
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slide-in-right {
      from { opacity: 0; transform: translateX(24px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes scale-in {
      from { opacity: 0; transform: scale(0.96) translateY(6px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .animate-fade-up { animation: fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both; }
    .spin { display: inline-block; animation: spin 0.9s linear infinite; }

    /* ---------- Overlay pieces ---------- */
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgba(28, 25, 23, 0.32);
      animation: fade-in 0.25s ease-out both;
    }
    .side-panel {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      z-index: 50;
      width: 100%;
      max-width: 26rem;
      background: #fff;
      box-shadow: -12px 0 40px rgba(0,0,0,0.14);
      padding: 1.5rem;
      overflow-y: auto;
      animation: slide-in-right 0.35s cubic-bezier(0.16,1,0.3,1) both;
    }
    .center-modal {
      width: 100%;
      max-width: 28rem;
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 24px 64px rgba(0,0,0,0.18);
      padding: 1.5rem;
      animation: scale-in 0.3s cubic-bezier(0.16,1,0.3,1) both;
    }

    /* ---------- Cards ---------- */
    .program-card {
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
      padding: 1.25rem;
      transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    .program-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 14px 34px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.05);
    }
    .program-card:focus-visible {
      outline: 2px solid #059669;
      outline-offset: 2px;
    }

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
      transition: background-color 0.2s, transform 0.15s, box-shadow 0.2s;
    }
    .action-btn:active { transform: scale(0.98); }
    .action-btn--ghost {
      border: 1px solid #e7e0d6;
      background: #fff;
      color: #1c1917;
    }
    .action-btn--ghost:hover { background: #f5f0e8; }
    .action-btn--solid {
      background: #059669;
      color: #fff;
    }
    .action-btn--solid:hover { background: #065f46; box-shadow: 0 6px 16px rgba(5,150,105,0.25); }

    .submit-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border-radius: 0.5rem;
      background: #059669;
      color: #fff;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.625rem;
      transition: background-color 0.2s, box-shadow 0.2s, transform 0.15s;
    }
    .submit-btn:hover:not(:disabled) { background: #065f46; box-shadow: 0 8px 20px rgba(5,150,105,0.22); }
    .submit-btn:active:not(:disabled) { transform: scale(0.99); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .close-btn {
      color: #a8a29e;
      cursor: pointer;
      background: none;
      border: none;
      transition: color 0.2s, transform 0.2s;
    }
    .close-btn:hover { color: #1c1917; transform: rotate(90deg); }

    /* ---------- Fields ---------- */
    .field-input {
      width: 100%;
      border-radius: 0.5rem;
      border: 1px solid #e7e0d6;
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field-input:focus {
      outline: none;
      border-color: #34d399;
      box-shadow: 0 0 0 3px rgba(52,211,153,0.25);
    }
    .field-error {
      font-size: 0.75rem;
      color: #dc2626;
      margin-top: 0.3rem;
    }

    /* ---------- Drop zone ---------- */
    .drop-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      border: 1.5px dashed #d9cfc0;
      border-radius: 0.75rem;
      padding: 1.5rem 1rem;
      cursor: pointer;
      color: #78716c;
      transition: border-color 0.2s, background 0.2s;
    }
    .drop-zone:hover { background: #faf7f2; border-color: #059669; }
    .drop-zone--active { background: #ecfdf5; border-color: #059669; }
    .drop-zone--filled { border-style: solid; border-color: #059669; background: #ecfdf5; }
    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }

    /* ---------- Reduced motion ---------- */
    @media (prefers-reduced-motion: reduce) {
      .animate-fade-up, .backdrop, .side-panel, .center-modal, .spin, .program-card {
        animation: none !important;
        transition: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
    }
  `],
})
export class ProgramsComponent implements OnInit, AfterViewInit {
  private readonly programsService = inject(ProgramsService);
  private readonly importService = inject(ImportService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('firstField') private firstField?: ElementRef<HTMLInputElement>;

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly panelOpen = signal(false);
  protected readonly programs = signal<ProgramWithCounts[]>([]);

  protected readonly domainImportOpen = signal(false);
  protected readonly domainImporting = signal(false);
  protected readonly domainImportResult = signal<DomainImportResult | null>(null);
  protected readonly dragActive = signal(false);
  protected readonly selectedFileName = signal<string | null>(null);
  protected domainImportType: ProgramType = 'INTERNSHIP' as ProgramType;

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

  ngAfterViewInit(): void {}

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.panelOpen()) this.panelOpen.set(false);
    if (this.domainImportOpen()) this.closeDomainImport();
  }

  protected openPanel(): void {
    this.panelOpen.set(true);
    setTimeout(() => this.firstField?.nativeElement.focus(), 50);
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
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

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleDomainFile(file);
  }

  protected onDomainFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleDomainFile(file);
  }

  private handleDomainFile(file: File): void {
    this.selectedFileName.set(file.name);
    this.domainImporting.set(true);
    this.importService.importStudentsByDomain(this.domainImportType, file).subscribe({
      next: (result) => {
        this.domainImporting.set(false);
        this.domainImportResult.set(result);
        this.toast.success(
          `${result.imported} students imported`,
          `${result.programsCreated.length} new program${result.programsCreated.length === 1 ? '' : 's'} created`,
        );
        this.fetch();
      },
      error: () => {
        this.domainImporting.set(false);
        this.selectedFileName.set(null);
        this.toast.error('Import failed', 'Check the CSV has Full Name, Email, and Domain columns');
      },
    });
  }

  protected closeDomainImport(): void {
    this.domainImportOpen.set(false);
    this.domainImportResult.set(null);
    this.selectedFileName.set(null);
  }

  protected typeLabel(type: ProgramType): string {
    return type.replace('_', ' ');
  }

  protected typeTone(type: ProgramType): BadgeTone {
    return TYPE_TONE[type];
  }
}