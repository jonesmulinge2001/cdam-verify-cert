import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style="background: linear-gradient(135deg, #ff000008 0%, #cf39da08 100%);">
      <!-- Animated background elements -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-10 animate-float" style="background: radial-gradient(circle, #ff0000, transparent 70%);"></div>
        <div class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full opacity-10 animate-float-delayed" style="background: radial-gradient(circle, #cf39da, transparent 70%);"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-5 animate-pulse-slow" style="background: radial-gradient(circle, #ff0000, #cf39da, transparent 70%);"></div>
      </div>

      <div class="w-full max-w-sm animate-fade-up relative z-10">
        <div class="text-center mb-8">
          <div class="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center font-display font-semibold text-xl text-white transition-all duration-500 hover:scale-110 hover:rotate-3 cursor-pointer relative group" style="background: linear-gradient(135deg, #ff0000, #cf39da); box-shadow: 0 8px 32px #cf39da30;">
            <span class="relative z-10">C</span>
            <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style="background: linear-gradient(135deg, #cf39da, #ff0000);"></div>
          </div>
          <h1 class="font-display text-2xl font-semibold mt-5" style="color: #cf39da;">CDAM Certify</h1>
          <p class="text-sm mt-1.5" style="color: #ff000080;">Sign in to the admin console</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-card p-6 space-y-5 transition-all duration-300 hover:shadow-xl" style="border: 1px solid #ff000010;">
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: #cf39da;" for="email">Email</label>
            <div class="relative group">
              <input
                id="email"
                type="email"
                formControlName="email"
                autocomplete="email"
                class="w-full rounded-xl border px-3 py-2.5 text-sm transition-all duration-300 focus:outline-none"
                style="border-color: #ff000020; background: white; color: #cf39da;"
                [style.borderColor]="form.get('email')?.valid && form.get('email')?.touched ? '#ff0000' : '#ff000020'"
                [style.boxShadow]="form.get('email')?.valid && form.get('email')?.touched ? '0 0 0 4px #ff000020' : ''"
                placeholder="you@cdam.chuka.ac.ke"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                @if (form.get('email')?.valid && form.get('email')?.touched) {
                  <span class="material-icons text-sm animate-scale-in" style="color: #ff0000;">check_circle</span>
                }
              </div>
            </div>
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <p class="text-xs mt-1.5 animate-slide-down" style="color: #ff0000;">
                <span class="material-icons text-[12px] align-middle mr-0.5">error_outline</span>
                Please enter a valid email
              </p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: #cf39da;" for="password">Password</label>
            <div class="relative group">
              <input
                id="password"
                type="password"
                formControlName="password"
                autocomplete="current-password"
                class="w-full rounded-xl border px-3 py-2.5 text-sm transition-all duration-300 focus:outline-none"
                style="border-color: #ff000020; background: white; color: #cf39da;"
                [style.borderColor]="form.get('password')?.valid && form.get('password')?.touched ? '#ff0000' : '#ff000020'"
                [style.boxShadow]="form.get('password')?.valid && form.get('password')?.touched ? '0 0 0 4px #ff000020' : ''"
                placeholder="••••••••"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                @if (form.get('password')?.valid && form.get('password')?.touched) {
                  <span class="material-icons text-sm animate-scale-in" style="color: #ff0000;">check_circle</span>
                }
              </div>
            </div>
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <p class="text-xs mt-1.5 animate-slide-down" style="color: #ff0000;">
                <span class="material-icons text-[12px] align-middle mr-0.5">error_outline</span>
                Password must be at least 8 characters
              </p>
            }
          </div>

          <button
            type="submit"
            [disabled]="form.invalid || submitting()"
            class="w-full rounded-xl text-white text-sm font-medium py-2.5 transition-all duration-300 relative overflow-hidden group"
            style="background: linear-gradient(135deg, #ff0000, #cf39da);"
            [style.opacity]="form.invalid || submitting() ? '0.6' : '1'"
            [style.cursor]="form.invalid || submitting() ? 'not-allowed' : 'pointer'"
          >
            <span class="relative z-10 flex items-center justify-center gap-2">
              @if (submitting()) {
                <span class="material-icons text-base animate-spin">progress_activity</span>
              }
              {{ submitting() ? 'Signing in...' : 'Sign in' }}
            </span>
            <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" [style.opacity]="form.invalid || submitting() ? '0' : ''"></div>
            <div class="absolute inset-0 transition-all duration-500" style="background: linear-gradient(135deg, #cf39da, #ff0000); opacity: 0;" [style.opacity]="form.invalid || submitting() ? '0' : ''"></div>
            @if (!submitting() && !form.invalid) {
              <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);"></div>
            }
          </button>

          <div class="relative my-2">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full" style="border-top: 1px solid #ff000010;"></div>
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="px-3" style="background: white; color: #ff000060;">Secure access</span>
            </div>
          </div>
        </form>

        <p class="text-center text-xs mt-6" style="color: #ff000040;">CDAM &middot; Chuka University</p>
      </div>
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
        transform: translateY(30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes float {
      0%, 100% {
        transform: translate(0, 0) scale(1);
      }
      50% {
        transform: translate(-20px, -30px) scale(1.1);
      }
    }

    @keyframes float-delayed {
      0%, 100% {
        transform: translate(0, 0) scale(1);
      }
      50% {
        transform: translate(20px, 30px) scale(1.1);
      }
    }

    @keyframes pulse-slow {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0.05;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.1);
        opacity: 0.08;
      }
    }

    @keyframes scale-in {
      from {
        transform: scale(0);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    @keyframes slide-down {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-up {
      animation: fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }

    .animate-float {
      animation: float 8s ease-in-out infinite;
    }

    .animate-float-delayed {
      animation: float-delayed 10s ease-in-out infinite;
    }

    .animate-pulse-slow {
      animation: pulse-slow 6s ease-in-out infinite;
    }

    .animate-scale-in {
      animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .animate-slide-down {
      animation: slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .shadow-card {
      box-shadow: 0 8px 40px rgba(207, 57, 218, 0.06), 0 2px 8px rgba(255, 0, 0, 0.04);
    }

    input:focus {
      border-color: #cf39da !important;
      box-shadow: 0 0 0 4px #cf39da20 !important;
    }

    input:hover {
      border-color: #cf39da60 !important;
    }

    input::placeholder {
      color: #ff000040;
    }

    input:focus::placeholder {
      color: #cf39da40;
    }

    input:not(:placeholder-shown) {
      border-color: #ff000040;
    }

    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #ff0000, #cf39da);
      border-radius: 3px;
    }

    @media (max-width: 640px) {
      .animate-fade-up {
        animation-duration: 0.5s;
      }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: (response) => {
        this.toast.success('Welcome back', `Signed in as ${response.user.fullName}`);
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error('Sign in failed', 'Check your email and password and try again');
      },
    });
  }
}