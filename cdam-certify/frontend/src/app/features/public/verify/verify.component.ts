import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { VerifyService } from '../../../core/services/verify.service';
import { VerificationResult } from '../../../core/models/certificate.model';

type ViewState = 'idle' | 'loading' | 'result';

const REASON_COPY: Record<string, { title: string; description: string }> = {
  not_found: {
    title: 'Certificate not found',
    description: 'No certificate matches this ID. Double-check it against the document, or contact CDAM directly.',
  },
  revoked: {
    title: 'Certificate revoked',
    description: 'This certificate was issued but has since been revoked and is no longer valid.',
  },
  signature_mismatch: {
    title: 'Could not verify this link',
    description: 'The verification link appears to be altered. Try scanning the QR code again, or enter the certificate ID manually below.',
  },
};

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex flex-col" style="background: linear-gradient(135deg, #b355c008 0%, #ff000008 100%);">
      <header class="px-8 py-6 backdrop-blur-sm bg-white/80" style="border-bottom: 1px solid #b355c010;">
        <div class="flex items-center gap-2.5 max-w-2xl mx-auto">
         
          <div>
            <p class="font-display text-sm font-medium text-black leading-none">CDAM | Certificate verification</p>
            <p class="text-xs text-black/40 mt-0.5">Chuka University</p>
          </div>
        </div>
      </header>

      <main class="flex-1 flex items-start justify-center px-4 pb-16">
        <div class="w-full max-w-lg mt-6">
          <div class="text-center mb-8 animate-fade-up">
            <div class="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4" 
                 style="background: linear-gradient(135deg, #b355c010, #ff000008); border: 1px solid #b355c020;">
              <span class="material-icons text-3xl" style="color: #cf39da;">verified</span>
            </div>
            <h1 class="font-display text-2xl font-semibold text-black">Verify a certificate</h1>
            <p class="text-sm mt-2 text-black/50">Enter the certificate ID printed on the document, or scan its QR code.</p>
          </div>

          <form (ngSubmit)="lookup()" class="flex gap-2 mb-8 animate-fade-up" style="animation-delay: 60ms">
            <input
              type="text"
              [(ngModel)]="certIdInput"
              name="certId"
              placeholder="CDAM-SC-2026-00231"
              class="flex-1 rounded-xl border px-4 py-3 text-sm font-mono text-black transition-all duration-300 focus:outline-none shadow-card"
              style="border-color: #b355c020; background: white;"
              [style.borderColor]="certIdInput.trim() ? '#ff0000' : '#b355c020'"
              [style.boxShadow]="certIdInput.trim() ? '0 0 0 3px #b355c020' : ''"
            />
            <button
              type="submit"
              [disabled]="!certIdInput.trim() || state() === 'loading'"
              class="rounded-xl text-white px-5 py-3 text-sm font-medium transition-all duration-300 shrink-0 relative overflow-hidden group"
              style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);"
              [style.opacity]="!certIdInput.trim() || state() === 'loading' ? '0.5' : '1'"
              [style.transform]="!certIdInput.trim() || state() === 'loading' ? 'scale(0.98)' : 'scale(1)'"
            >
              <span class="relative z-10">Verify</span>
              <span class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
              <span class="absolute inset-0 transition-all duration-500" style="background: linear-gradient(135deg, #b355c0, #cf39da, #ff0000); opacity: 0;" [style.opacity]="!certIdInput.trim() || state() === 'loading' ? '0' : ''"></span>
              @if (certIdInput.trim() && state() !== 'loading') {
                <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);"></div>
              }
            </button>
          </form>

          @if (state() === 'loading') {
            <div class="bg-white rounded-2xl shadow-card p-8 flex flex-col items-center animate-fade-up transition-all duration-500" style="border: 1px solid #b355c010;">
              <div class="relative">
                <div class="h-12 w-12 rounded-full animate-spin" style="border: 3px solid #b355c020; border-top-color: #cf39da;"></div>
                <div class="absolute inset-0 h-12 w-12 rounded-full animate-pulse" style="background: radial-gradient(circle, #b355c020, transparent);"></div>
              </div>
              <p class="text-sm mt-3 text-black/50">Checking the certificate registry&hellip;</p>
            </div>
          }

          @if (state() === 'result' && result(); as result) {
            @if (result.valid) {
              <div class="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-up transition-all duration-500 hover:shadow-xl" style="border: 1px solid #b355c010;">
                <div class="px-8 py-8 flex flex-col items-center text-white relative overflow-hidden" style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);">
                  <div class="absolute inset-0 opacity-10">
                    <div class="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white"></div>
                    <div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white"></div>
                  </div>
                  <div class="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center animate-seal-pop backdrop-blur-sm transition-transform hover:scale-110 duration-300">
                    <span class="material-icons text-3xl">verified</span>
                  </div>
                  <p class="font-display text-lg font-semibold mt-4 relative z-10">Certificate is valid</p>
                </div>
                <div class="p-6 space-y-4">
                  @for (item of [
                    { label: 'Certified to', value: result.studentName, class: 'font-display text-lg font-medium' },
                    { label: 'Program', value: result.programName, class: 'text-sm' },
                    { label: 'Issued', value: formatDate(result.issuedAt), class: 'text-sm' }
                  ]; track item.label) {
                    <div class="animate-fade-up" [style.animation-delay]="(loopIndex + 1) * 100 + 'ms'">
                      <p class="text-xs uppercase tracking-wide text-black/40">{{ item.label }}</p>
                      <p class="mt-0.5 text-black" [class]="item.class">{{ item.value }}</p>
                      @if (item.label === 'Program') {
                        <p class="text-xs mt-0.5 text-black/40">{{ formatType(result.programType) }}</p>
                      }
                    </div>
                  }
                  <div class="pt-3 border-t flex items-center justify-between" style="border-color: #b355c010;">
                    <span class="font-mono text-xs text-black/40">{{ result.certId }}</span>
                    @if (result.fileUrl) {
                      <a [href]="result.fileUrl" target="_blank" class="text-sm font-medium inline-flex items-center gap-1 transition-all duration-300 hover:scale-105" style="color: #cf39da;">
                        View PDF <span class="material-icons text-[16px]">open_in_new</span>
                      </a>
                    }
                  </div>
                </div>
              </div>
            } @else {
              <div class="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-up transition-all duration-500 hover:shadow-xl" style="border: 1px solid #b355c010;">
                <div class="px-8 py-8 flex flex-col items-center text-white relative overflow-hidden" style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);">
                  <div class="absolute inset-0 opacity-10">
                    <div class="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white"></div>
                    <div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white"></div>
                  </div>
                  <div class="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center animate-seal-pop backdrop-blur-sm transition-transform hover:scale-110 duration-300">
                    <span class="material-icons text-3xl">gpp_maybe</span>
                  </div>
                  <p class="font-display text-lg font-semibold mt-4 relative z-10">{{ reasonCopy(result.reason).title }}</p>
                </div>
                <div class="p-6">
                  <p class="text-sm text-black/50">{{ reasonCopy(result.reason).description }}</p>
                </div>
              </div>
            }
          }
        </div>
      </main>
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

    @keyframes seal-pop {
      0% {
        transform: scale(0.5);
        opacity: 0;
      }
      60% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    .animate-fade-up {
      animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }

    .animate-seal-pop {
      animation: seal-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .shadow-card {
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
    }

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

    button:not(:disabled):hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 8px 24px #b355c040 !important;
    }

    button:not(:disabled):active {
      transform: scale(0.95) !important;
    }

    @media (max-width: 640px) {
      .animate-fade-up {
        animation-duration: 0.4s;
      }
    }
  `]
})
export class VerifyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly verifyService = inject(VerifyService);

  protected readonly state = signal<ViewState>('idle');
  protected readonly result = signal<VerificationResult | null>(null);
  protected certIdInput = '';
  protected loopIndex = 0;

  ngOnInit(): void {
    const certId = this.route.snapshot.paramMap.get('certId');
    const token = this.route.snapshot.queryParamMap.get('t') ?? undefined;
    if (certId) {
      this.certIdInput = certId;
      this.runLookup(certId, token);
    }
  }

  protected lookup(): void {
    const value = this.certIdInput.trim();
    if (!value) return;
    this.runLookup(value);
  }

  private runLookup(certId: string, token?: string): void {
    this.state.set('loading');
    this.verifyService.verify(certId, token).subscribe({
      next: (result) => {
        this.result.set(result);
        this.state.set('result');
      },
      error: () => {
        this.result.set({ valid: false, reason: 'not_found' });
        this.state.set('result');
      },
    });
  }

  protected reasonCopy(reason?: string) {
    return REASON_COPY[reason ?? 'not_found'] ?? REASON_COPY['not_found'];
  }

  protected formatType(type?: string): string {
    return type ? type.replace('_', ' ') : '';
  }

  protected formatDate(iso?: string): string {
    if (!iso) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  }
}