import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Certificate } from '../../../core/models/certificate.model';
import { CertificatesService } from '../../../core/services/certificates.service';
import { ToastService } from '../../../core/services/toast.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SkeletonRowsComponent } from '../../../shared/components/skeleton/skeleton-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, BadgeComponent, SkeletonRowsComponent, EmptyStateComponent],
  template: `
    <div class="max-w-7xl mx-auto px-8 py-8">
      <header class="mb-8 animate-fade-up">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="font-display text-3xl font-semibold text-black">Certificates</h1>
            <p class="text-sm mt-1.5 text-black/60">Every certificate ever issued, across all programs.</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 px-4 py-2 rounded-xl" style="background: #b355c008; border: 1px solid #b355c020;">
              <span class="material-icons text-sm" style="color: #cf39da;">assessment</span>
              <span class="text-sm font-medium text-black">{{ certificates().length }} total</span>
            </div>
          </div>
        </div>
      </header>

      @if (loading()) {
        <div class="animate-fade-up" style="animation-delay: 100ms;">
          <app-skeleton-rows [rows]="6" />
        </div>
      } @else if (certificates().length === 0) {
        <div class="animate-fade-up" style="animation-delay: 100ms;">
          <app-empty-state icon="workspace_premium" title="No certificates issued yet" description="Issue certificates from a program's detail page once students are marked completed." />
        </div>
      } @else {
        <div class="bg-white rounded-2xl shadow-card overflow-hidden transition-all duration-300 hover:shadow-xl animate-fade-up" style="animation-delay: 100ms; border: 1px solid #b355c010;">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wide text-black/50" style="background: #b355c004;">
                  <th class="px-5 py-4 font-semibold">Certificate</th>
                  <th class="px-5 py-4 font-semibold">Student</th>
                  <th class="px-5 py-4 font-semibold">Program</th>
                  <th class="px-5 py-4 font-semibold">Email</th>
                  <th class="px-5 py-4 font-semibold">Status</th>
                  <th class="px-5 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (cert of certificates(); track cert.id; let idx = $index) {
                  <tr class="border-t transition-all duration-300 hover:scale-[1.002] hover:shadow-sm" 
                      style="border-color: #b355c008;"
                      [style.animation-delay]="(idx * 50) + 'ms'"
                      [class]="idx % 2 === 0 ? 'bg-white' : 'bg-[#b355c002]'">
                    <td class="px-5 py-4">
                      <a [href]="cert.fileUrl" target="_blank" 
                         class="font-mono text-xs transition-all duration-300 hover:scale-105 inline-block"
                         style="color: #ff0000;"
                         [style.color]="cert.status === 'REVOKED' ? '#b355c080' : '#ff0000'">
                        <span class="flex items-center gap-1.5">
                          <span class="material-icons text-[14px]" style="color: #b355c040;">description</span>
                          {{ cert.certId }}
                          <span class="material-icons text-[12px] transition-transform duration-300 group-hover:translate-x-0.5" style="color: #b355c060;">open_in_new</span>
                        </span>
                      </a>
                    </td>
                    <td class="px-5 py-4 font-medium text-black">{{ cert.studentProgram.student.fullName }}</td>
                    <td class="px-5 py-4 text-black/60">{{ cert.studentProgram.program.name }}</td>
                    <td class="px-5 py-4">
                      @if (cert.emailBouncedAt) {
                        <app-badge tone="red">Bounced</app-badge>
                      } @else if (cert.emailSentAt) {
                        <app-badge tone="emerald">Delivered</app-badge>
                      } @else {
                        <app-badge tone="sand">Pending</app-badge>
                      }
                    </td>
                    <td class="px-5 py-4">
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300"
                            [style.background]="cert.status === 'VALID' ? '#ff000008' : '#b355c008'"
                            [style.color]="cert.status === 'VALID' ? '#ff0000' : '#b355c080'"
                            [style.border]="cert.status === 'VALID' ? '1px solid #ff000020' : '1px solid #b355c010'">
                        <span class="h-1.5 w-1.5 rounded-full animate-pulse"
                              [style.background]="cert.status === 'VALID' ? '#ff0000' : '#b355c060'"></span>
                        {{ cert.status }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex justify-end gap-2">
                        <button type="button" (click)="resend(cert)" 
                                class="p-2 rounded-lg transition-all duration-300 hover:scale-110 group relative"
                                style="color: #b355c060; background: #b355c004;"
                                [style.color]="cert.emailBouncedAt ? '#ff0000' : '#b355c060'"
                                title="Resend email">
                          <span class="material-icons text-[18px] transition-transform duration-300 group-hover:rotate-12">forward_to_inbox</span>
                          <span class="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap"
                                style="background: #cf39da; color: white;">Resend</span>
                        </button>
                        @if (cert.status === 'VALID') {
                          <button type="button" (click)="revoke(cert)" 
                                  class="p-2 rounded-lg transition-all duration-300 hover:scale-110 group relative"
                                  style="color: #b355c040; background: #b355c004;"
                                  title="Revoke certificate">
                            <span class="material-icons text-[18px] transition-transform duration-300 group-hover:rotate-12">block</span>
                            <span class="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap"
                                  style="background: #ff0000; color: white;">Revoke</span>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          
          <!-- Footer with pagination info -->
          <div class="px-5 py-3 border-t flex items-center justify-between" style="border-color: #b355c008; background: #b355c002;">
            <span class="text-xs text-black/40">Showing {{ certificates().length }} certificates</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-black/40">Last updated: {{ lastUpdated | date:'medium' }}</span>
            </div>
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

    /* Action buttons tooltip positioning */
    .group {
      position: relative;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      td, th {
        padding: 0.75rem 0.75rem !important;
      }
      
      .font-mono.text-xs {
        font-size: 0.65rem;
      }
    }

    @media (max-width: 640px) {
      .animate-fade-up {
        animation-duration: 0.4s;
      }
    }
  `]
})
export class CertificatesComponent implements OnInit {
  private readonly certificatesService = inject(CertificatesService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly certificates = signal<Certificate[]>([]);
  protected lastUpdated = new Date();

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.certificatesService.list().subscribe({
      next: (certs) => {
        this.certificates.set(certs);
        this.loading.set(false);
        this.lastUpdated = new Date();
      },
      error: () => this.loading.set(false),
    });
  }

  protected resend(cert: Certificate): void {
    this.certificatesService.resend(cert.id).subscribe({
      next: () => {
        this.toast.success('Resend queued', `${cert.certId} will be re-emailed shortly`);
        this.fetch();
      },
      error: () => this.toast.error('Could not queue resend'),
    });
  }

  protected revoke(cert: Certificate): void {
    const reason = window.prompt(`Reason for revoking ${cert.certId}:`);
    if (!reason) return;

    this.certificatesService.revoke(cert.id, reason).subscribe({
      next: () => {
        this.toast.warning('Certificate revoked', `${cert.certId} will now fail verification`);
        this.fetch();
      },
      error: () => this.toast.error('Could not revoke certificate'),
    });
  }
}