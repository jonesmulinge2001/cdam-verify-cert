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
    <div class="min-h-screen flex flex-col relative overflow-hidden" style="background: linear-gradient(135deg, #b355c008 0%, #ff000008 100%);">
      <!-- Animated background particles -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full" style="background: radial-gradient(circle, #b355c015, transparent); animation: float-particle 20s ease-in-out infinite;"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full" style="background: radial-gradient(circle, #ff000015, transparent); animation: float-particle 25s ease-in-out infinite reverse;"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style="background: radial-gradient(circle, #cf39da08, transparent); animation: float-particle 30s ease-in-out infinite;"></div>
      </div>

      <header class="px-8 py-6 backdrop-blur-sm bg-white/80 relative z-10 transition-all duration-500 hover:bg-white/90" style="border-bottom: 1px solid #b355c010;">
        <div class="flex items-center gap-2.5 max-w-2xl mx-auto">
          <!-- <div class="relative">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 hover:scale-110 hover:rotate-6" style="background: linear-gradient(135deg, #b355c020, #ff000020);">
              <span class="text-lg font-bold" style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">CD</span>
            </div>
          </div> -->
          <div>
            <p class="font-display text-sm font-medium text-black leading-none transition-all duration-300 hover:tracking-wide">CDAM | Internship Certificate verification</p>
            <p class="text-xs text-black/40 mt-0.5 transition-all duration-300">Chuka University</p>
          </div>
        </div>
      </header>

      <main class="flex-1 flex items-start justify-center px-4 pb-16 relative z-10">
        <div class="w-full max-w-lg mt-6">
          <div class="text-center mb-8 animate-fade-up">
            <div class="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 hover:scale-110 hover:rotate-12" 
                 style="background: linear-gradient(135deg, #b355c010, #ff000008); border: 1px solid #b355c020;">
              <span class="material-icons text-3xl transition-all duration-500 group-hover:scale-110" style="color: #cf39da;">verified</span>
            </div>
            <h1 class="font-display text-2xl font-semibold text-black transition-all duration-300 hover:tracking-wide">Verify a certificate</h1>
            <p class="text-sm mt-2 text-black/50 transition-all duration-300">Enter the certificate ID printed on the document, or scan its QR code.</p>
          </div>

          <form (ngSubmit)="lookup()" class="flex gap-2 mb-8 animate-fade-up" style="animation-delay: 60ms">
            <div class="relative flex-1 group">
              <input
                type="text"
                [(ngModel)]="certIdInput"
                name="certId"
                placeholder="CDAM-SC-2026-00231"
                class="w-full rounded-xl border px-4 py-3 text-sm font-mono text-black transition-all duration-300 focus:outline-none shadow-card placeholder:transition-all placeholder:duration-300 group-hover:placeholder:text-black/60"
                style="border-color: #b355c020; background: white;"
                [style.borderColor]="certIdInput.trim() ? '#ff0000' : '#b355c020'"
                [style.boxShadow]="certIdInput.trim() ? '0 0 0 3px #b355c020' : ''"
              />
              <div class="absolute inset-0 rounded-xl pointer-events-none transition-all duration-300 group-hover:shadow-lg" style="box-shadow: 0 0 0 0 #b355c020;"></div>
            </div>
            <button
              type="submit"
              [disabled]="!certIdInput.trim() || state() === 'loading'"
              class="rounded-xl text-white px-5 py-3 text-sm font-medium transition-all duration-300 shrink-0 relative overflow-hidden group"
              style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0); background-size: 200% 200%;"
              [style.opacity]="!certIdInput.trim() || state() === 'loading' ? '0.5' : '1'"
              [style.transform]="!certIdInput.trim() || state() === 'loading' ? 'scale(0.98)' : 'scale(1)'"
              [style.background-position]="!certIdInput.trim() || state() === 'loading' ? '0% 50%' : '100% 50%'"
            >
              <span class="relative z-10 transition-all duration-300 group-hover:tracking-wider">Verify</span>
              <span class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-500"></span>
              <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);"></div>
              <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style="background: linear-gradient(135deg, #b355c0, #cf39da, #ff0000);"></div>
            </button>
          </form>

          @if (state() === 'loading') {
            <div class="bg-white rounded-2xl shadow-card p-8 flex flex-col items-center animate-fade-up transition-all duration-500 hover:shadow-xl" style="border: 1px solid #b355c010;">
              <div class="relative">
                <div class="h-12 w-12 rounded-full animate-spin-slow" style="border: 3px solid #b355c020; border-top-color: #cf39da;"></div>
                <div class="absolute inset-0 h-12 w-12 rounded-full animate-pulse-slow" style="background: radial-gradient(circle, #b355c020, transparent);"></div>
              </div>
              <p class="text-sm mt-3 text-black/50 animate-pulse-slow">Checking the certificate registry&hellip;</p>
            </div>
          }

          @if (state() === 'result' && result(); as result) {
            @if (result.valid) {
              <div class="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-up transition-all duration-500 hover:shadow-2xl hover:-translate-y-1" style="border: 1px solid #b355c010;">
                <div class="px-8 py-8 flex flex-col items-center text-white relative overflow-hidden group" style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0); background-size: 200% 200%; animation: gradient-shift 8s ease-in-out infinite;">
                  <div class="absolute inset-0 opacity-10 transition-all duration-1000 group-hover:scale-110">
                    <div class="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white animate-float"></div>
                    <div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white animate-float-delayed"></div>
                  </div>
                  <div class="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center animate-seal-pop backdrop-blur-sm transition-all duration-500 hover:scale-110 hover:rotate-12">
                    <span class="material-icons text-3xl transition-all duration-500 group-hover:scale-110">verified</span>
                  </div>
                  <p class="font-display text-lg font-semibold mt-4 relative z-10 transition-all duration-300 group-hover:tracking-wide">Certificate is valid</p>
                  <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/30 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-1000"></div>
                </div>
                <div class="p-6 space-y-4">
                  @for (item of [
                    { label: 'Certified to', value: result.studentName, class: 'font-display text-lg font-medium' },
                    { label: 'Program', value: result.programName, class: 'text-sm' },
                    { label: 'Issued', value: formatDate(result.issuedAt), class: 'text-sm' }
                  ]; track item.label) {
                    <div class="animate-fade-up group/item" [style.animation-delay]="(loopIndex + 1) * 100 + 'ms'">
                      <p class="text-xs uppercase tracking-wide text-black/40 transition-all duration-300 group-hover/item:text-black/60">{{ item.label }}</p>
                      <p class="mt-0.5 text-black transition-all duration-300 group-hover/item:translate-x-1" [class]="item.class">{{ item.value }}</p>
                      @if (item.label === 'Program') {
                        <p class="text-xs mt-0.5 text-black/40 transition-all duration-300 group-hover/item:text-black/60">{{ formatType(result.programType) }}</p>
                      }
                    </div>
                  }
                  <div class="pt-3 border-t flex items-center justify-between transition-all duration-300 hover:pt-4" style="border-color: #b355c010;">
                    <span class="font-mono text-xs text-black/40 transition-all duration-300 hover:text-black/60">{{ result.certId }}</span>
                    @if (result.fileUrl) {
                      <a [href]="result.fileUrl" target="_blank" class="text-sm font-medium inline-flex items-center gap-1 transition-all duration-300 hover:scale-105 hover:gap-2 group/link" style="color: #cf39da;">
                        View PDF <span class="material-icons text-[16px] transition-all duration-300 group-hover/link:translate-x-1">open_in_new</span>
                      </a>
                    }
                  </div>
                </div>
              </div>
            } @else {
              <div class="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-up transition-all duration-500 hover:shadow-2xl hover:-translate-y-1" style="border: 1px solid #b355c010;">
                <div class="px-8 py-8 flex flex-col items-center text-white relative overflow-hidden group" style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0); background-size: 200% 200%; animation: gradient-shift 8s ease-in-out infinite;">
                  <div class="absolute inset-0 opacity-10 transition-all duration-1000 group-hover:scale-110">
                    <div class="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white animate-float"></div>
                    <div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white animate-float-delayed"></div>
                  </div>
                  <div class="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center animate-seal-pop backdrop-blur-sm transition-all duration-500 hover:scale-110 hover:rotate-12">
                    <span class="material-icons text-3xl transition-all duration-500 group-hover:scale-110">gpp_maybe</span>
                  </div>
                  <p class="font-display text-lg font-semibold mt-4 relative z-10 transition-all duration-300 group-hover:tracking-wide">{{ reasonCopy(result.reason).title }}</p>
                  <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/30 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-1000"></div>
                </div>
                <div class="p-6 transition-all duration-300 hover:p-7">
                  <p class="text-sm text-black/50 transition-all duration-300 hover:text-black/70">{{ reasonCopy(result.reason).description }}</p>
                </div>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

    * {
      font-family: 'Poppins', sans-serif;
    }

    .font-display {
      font-family: 'Poppins', sans-serif;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    @keyframes fade-up {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes seal-pop {
      0% {
        transform: scale(0.3) rotate(-10deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.15) rotate(5deg);
      }
      70% {
        transform: scale(0.95) rotate(-2deg);
      }
      100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
      }
    }

    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes pulse-slow {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes float-particle {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -20px) scale(1.1); }
      66% { transform: translate(-20px, 30px) scale(0.9); }
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(0, -20px); }
    }

    @keyframes float-delayed {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(0, 20px); }
    }

    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .animate-fade-up {
      animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }

    .animate-seal-pop {
      animation: seal-pop 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .animate-spin-slow {
      animation: spin-slow 1.2s linear infinite;
    }

    .animate-pulse-slow {
      animation: pulse-slow 2s ease-in-out infinite;
    }

    .animate-float {
      animation: float 6s ease-in-out infinite;
    }

    .animate-float-delayed {
      animation: float-delayed 6s ease-in-out infinite 1s;
    }

    .shadow-card {
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
      transition: box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .shadow-card:hover {
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
    }

    input {
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    input:focus {
      border-color: #cf39da !important;
      box-shadow: 0 0 0 4px #b355c020, 0 8px 32px #b355c010 !important;
      transform: scale(1.01);
    }

    input:hover {
      border-color: #b355c060 !important;
      transform: scale(1.01);
    }

    input::placeholder {
      color: #b355c040;
      transition: color 0.3s ease;
    }

    input:focus::placeholder {
      color: #b355c080;
      transform: translateX(4px);
    }

    button:not(:disabled) {
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    button:not(:disabled):hover {
      transform: translateY(-3px) scale(1.02) !important;
      box-shadow: 0 12px 40px rgba(179, 85, 192, 0.3) !important;
    }

    button:not(:disabled):active {
      transform: scale(0.95) !important;
      transition-duration: 0.1s !important;
    }

    @media (max-width: 640px) {
      .animate-fade-up {
        animation-duration: 0.5s;
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