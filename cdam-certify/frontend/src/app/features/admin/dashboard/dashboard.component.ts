import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProgramsService } from '../../../core/services/programs.service';
import { ProgramWithCounts } from '../../../core/models/program.model';
import { SkeletonRowsComponent } from '../../../shared/components/skeleton/skeleton-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

type SortKey = 'name' | 'totalApplicants' | 'totalCompleted' | 'totalCertified';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonRowsComponent, EmptyStateComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header class="mb-6 sm:mb-8 animate-fade-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold text-black">Dashboard</h1>
          <p class="text-sm mt-1.5 text-black/60">Applicants, completions, and certificates issued across every cohort.</p>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 rounded-xl w-fit brand-chip">
          <span class="material-icons text-sm brand-text">dashboard</span>
          <span class="text-sm font-medium text-black">{{ programs().length }} program{{ programs().length === 1 ? '' : 's' }}</span>
        </div>
      </header>

      @if (loading()) {
        <div class="animate-fade-up" style="animation-delay: 100ms;">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
            @for (i of [0,1,2]; track i) {
              <div class="stat-skeleton" [style.animation-delay]="(i * 80) + 'ms'"></div>
            }
          </div>
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
        <!-- Stat cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
          <div class="stat-card animate-fade-up" style="animation-delay: 0ms;">
            <div class="flex items-center gap-3 mb-2">
              <div class="stat-icon">
                <span class="material-icons text-[18px] brand-text">people</span>
              </div>
              <p class="text-sm text-black/60">Total applicants</p>
            </div>
            <p class="font-display text-3xl font-semibold text-black mt-1 tabular-nums">{{ totalApplicants() }}</p>
          </div>

          <div class="stat-card animate-fade-up" style="animation-delay: 70ms;">
            <div class="flex items-center gap-3 mb-2">
              <div class="stat-icon">
                <span class="material-icons text-[18px] brand-text">check_circle</span>
              </div>
              <p class="text-sm text-black/60">Completed programs</p>
            </div>
            <p class="font-display text-3xl font-semibold text-black mt-1 tabular-nums">{{ totalCompleted() }}</p>
          </div>

          <div class="stat-card stat-card--accent animate-fade-up" style="animation-delay: 140ms;">
            <div class="flex items-center gap-3 mb-2">
              <div class="stat-icon stat-icon--accent">
                <span class="material-icons text-[18px] brand-text">verified</span>
              </div>
              <p class="text-sm text-black/60">Certificates issued</p>
            </div>
            <p class="font-display text-3xl font-semibold mt-1 tabular-nums brand-text">{{ totalCertified() }}</p>
          </div>
        </div>

        <!-- Cohorts panel -->
        <div class="panel animate-fade-up" style="animation-delay: 200ms;">
          <div class="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 panel-header">
            <h2 class="font-display text-sm font-medium text-black">Active cohorts</h2>

            <div class="flex items-center gap-2 w-full sm:w-auto">
              <div class="search-field flex-1 sm:flex-initial">
                <span class="material-icons text-[16px] text-black/35">search</span>
                <input
                  type="text"
                  [value]="query()"
                  (input)="query.set($any($event.target).value)"
                  placeholder="Filter cohorts"
                  aria-label="Filter cohorts by name"
                  class="search-input"
                />
              </div>
              <a routerLink="/admin/programs"
                 class="text-sm font-medium inline-flex items-center gap-1 whitespace-nowrap link-accent">
                View all <span class="material-icons text-[16px] link-arrow">arrow_forward</span>
              </a>
            </div>
          </div>

          @if (filteredPrograms().length === 0) {
            <div class="px-5 py-10 text-center text-sm text-black/50">
              No cohorts match "{{ query() }}".
            </div>
          } @else {
            <!-- Desktop / tablet: table -->
            <div class="hidden sm:block overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase tracking-wide text-black/50 table-head-row">
                    <th class="px-5 py-4 font-semibold">
                      <button type="button" class="sort-btn" (click)="toggleSort('name')">
                        Program {{ sortIndicator('name') }}
                      </button>
                    </th>
                    <th class="px-5 py-4 font-semibold">
                      <button type="button" class="sort-btn" (click)="toggleSort('totalApplicants')">
                        Applicants {{ sortIndicator('totalApplicants') }}
                      </button>
                    </th>
                    <th class="px-5 py-4 font-semibold">
                      <button type="button" class="sort-btn" (click)="toggleSort('totalCompleted')">
                        Completed {{ sortIndicator('totalCompleted') }}
                      </button>
                    </th>
                    <th class="px-5 py-4 font-semibold">
                      <button type="button" class="sort-btn" (click)="toggleSort('totalCertified')">
                        Certified {{ sortIndicator('totalCertified') }}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (program of filteredPrograms(); track program.id; let idx = $index) {
                    <tr
                      [routerLink]="['/admin/programs', program.id]"
                      tabindex="0"
                      class="cohort-row"
                      [style.animation-delay]="(idx * 40) + 'ms'"
                      [class.row-alt]="idx % 2 !== 0"
                    >
                      <td class="px-5 py-4">
                        <p class="font-medium text-black">{{ program.name }}</p>
                        <p class="text-xs mt-0.5 text-black/40">{{ program.cohortLabel ?? program.type }}</p>
                      </td>
                      <td class="px-5 py-4 text-black/60 tabular-nums">{{ program.totalApplicants }}</td>
                      <td class="px-5 py-4 text-black/60 tabular-nums">{{ program.totalCompleted }}</td>
                      <td class="px-5 py-4 font-medium tabular-nums brand-text">{{ program.totalCertified }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile: stacked cards -->
            <div class="sm:hidden divide-y divide-black/5">
              @for (program of filteredPrograms(); track program.id; let idx = $index) {
                <a
                  [routerLink]="['/admin/programs', program.id]"
                  class="cohort-card"
                  [style.animation-delay]="(idx * 40) + 'ms'"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="font-medium text-black truncate">{{ program.name }}</p>
                      <p class="text-xs mt-0.5 text-black/40">{{ program.cohortLabel ?? program.type }}</p>
                    </div>
                    <span class="material-icons text-[18px] text-black/25">chevron_right</span>
                  </div>
                  <div class="flex items-center gap-4 mt-3 text-xs">
                    <span class="cohort-metric"><b class="tabular-nums">{{ program.totalApplicants }}</b> applicants</span>
                    <span class="cohort-metric"><b class="tabular-nums">{{ program.totalCompleted }}</b> completed</span>
                    <span class="cohort-metric brand-text"><b class="tabular-nums">{{ program.totalCertified }}</b> certified</span>
                  </div>
                </a>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

    :host {
      --brand: #cf39da;
      --brand-tint-04: #b355c004;
      --brand-tint-08: #b355c008;
      --brand-tint-10: #b355c010;
      --brand-tint-20: #b355c020;
      display: block;
    }

    * {
      font-family: 'Poppins', sans-serif;
    }

    .font-display {
      font-family: 'Poppins', sans-serif;
    }

    .brand-text { color: var(--brand); }
    .brand-chip {
      background: var(--brand-tint-08);
      border: 1px solid var(--brand-tint-20);
    }

    /* ---------- Motion ---------- */
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes pulse-bg {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .animate-fade-up {
      animation: fade-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* ---------- Stat cards ---------- */
    .stat-card {
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
      padding: 1.5rem;
      border: 1px solid var(--brand-tint-10);
      transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s;
    }
    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05);
      border-color: var(--brand-tint-20);
    }
    .stat-card--accent { position: relative; overflow: hidden; }
    .stat-card--accent::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, var(--brand-tint-08), transparent 60%);
      pointer-events: none;
    }
    .stat-icon {
      height: 2.5rem;
      width: 2.5rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--brand-tint-10);
      transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    .stat-card:hover .stat-icon { transform: scale(1.08) rotate(-4deg); }
    .stat-icon--accent { background: var(--brand-tint-20); }

    .stat-skeleton {
      height: 110px;
      border-radius: 1rem;
      background: linear-gradient(90deg, #f3f3f4 25%, #ececee 37%, #f3f3f4 63%);
      background-size: 400% 100%;
      animation: shimmer 1.6s ease-in-out infinite, fade-up 0.55s cubic-bezier(0.16,1,0.3,1) both;
    }

    /* ---------- Panel ---------- */
    .panel {
      background: #fff;
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
      border: 1px solid var(--brand-tint-10);
      transition: box-shadow 0.3s;
    }
    .panel-header { border-bottom: 1px solid var(--brand-tint-10); }

    .search-field {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.75rem;
      border-radius: 0.65rem;
      background: var(--brand-tint-04);
      border: 1px solid transparent;
      transition: border-color 0.2s, background 0.2s;
    }
    .search-field:focus-within {
      border-color: var(--brand-tint-20);
      background: #fff;
    }
    .search-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.85rem;
      width: 100%;
      color: #000;
    }
    .search-input::placeholder { color: rgba(0,0,0,0.35); }

    .link-accent { color: var(--brand); transition: gap 0.2s, opacity 0.2s; }
    .link-accent:hover { opacity: 0.8; }
    .link-arrow { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1); }
    .link-accent:hover .link-arrow { transform: translateX(3px); }

    .sort-btn {
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
      color: inherit;
      text-transform: inherit;
      letter-spacing: inherit;
      transition: color 0.2s;
    }
    .sort-btn:hover { color: var(--brand); }

    .table-head-row { background: var(--brand-tint-04); }

    /* ---------- Rows ---------- */
    .cohort-row {
      position: relative;
      border-top: 1px solid var(--brand-tint-08);
      cursor: pointer;
      transition: background 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.25s cubic-bezier(0.16,1,0.3,1);
      animation: fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both;
    }
    .cohort-row.row-alt { background: var(--brand-tint-04); }
    .cohort-row:hover, .cohort-row:focus-visible {
      background: var(--brand-tint-08);
      transform: scale(1.002);
    }
    .cohort-row:focus-visible {
      outline: 2px solid var(--brand);
      outline-offset: -2px;
    }

    /* ---------- Mobile cards ---------- */
    .cohort-card {
      display: block;
      padding: 1rem 1.25rem;
      animation: fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both;
      transition: background 0.2s;
    }
    .cohort-card:active { background: var(--brand-tint-08); }
    .cohort-card:focus-visible {
      outline: 2px solid var(--brand);
      outline-offset: -2px;
    }
    .cohort-metric { color: rgba(0,0,0,0.55); }
    .cohort-metric b { color: #000; font-weight: 600; }

    /* ---------- Scrollbar ---------- */
    .overflow-x-auto::-webkit-scrollbar { height: 6px; }
    .overflow-x-auto::-webkit-scrollbar-track {
      background: var(--brand-tint-04);
      border-radius: 3px;
    }
    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: linear-gradient(90deg, var(--brand), #b355c0);
      border-radius: 3px;
    }

    .tabular-nums { font-variant-numeric: tabular-nums; }

    /* ---------- Responsive ---------- */
    @media (max-width: 768px) {
      td, th { padding: 0.75rem 0.75rem !important; }
    }

    /* ---------- Reduced motion ---------- */
    @media (prefers-reduced-motion: reduce) {
      .animate-fade-up,
      .stat-skeleton,
      .cohort-row,
      .cohort-card {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
      .stat-card, .stat-icon, .cohort-row, .link-arrow {
        transition: none !important;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly programsService = inject(ProgramsService);

  protected readonly loading = signal(true);
  protected readonly programs = signal<ProgramWithCounts[]>([]);
  protected readonly query = signal('');
  private readonly sortKey = signal<SortKey | null>(null);
  private readonly sortAsc = signal(true);

  protected readonly totalApplicants = computed(() =>
    this.programs().reduce((sum, p) => sum + p.totalApplicants, 0)
  );
  protected readonly totalCompleted = computed(() =>
    this.programs().reduce((sum, p) => sum + p.totalCompleted, 0)
  );
  protected readonly totalCertified = computed(() =>
    this.programs().reduce((sum, p) => sum + p.totalCertified, 0)
  );

  protected readonly filteredPrograms = computed(() => {
    const q = this.query().trim().toLowerCase();
    let list = this.programs();

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.cohortLabel ?? p.type ?? '').toLowerCase().includes(q)
      );
    }

    const key = this.sortKey();
    if (key) {
      const asc = this.sortAsc();
      list = [...list].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return asc ? cmp : -cmp;
      });
    }

    return list;
  });

  ngOnInit(): void {
    this.programsService.list().subscribe({
      next: (programs) => {
        this.programs.set(programs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortKey.set(key);
      this.sortAsc.set(true);
    }
  }

  protected sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortAsc() ? '↑' : '↓';
  }
}