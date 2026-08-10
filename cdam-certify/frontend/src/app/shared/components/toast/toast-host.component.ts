import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastVariant } from '../../../core/services/toast.service';

const VARIANT_STYLES: Record<ToastVariant, { icon: string; iconBg: string; iconColor: string; borderColor: string }> = {
  success: { 
    icon: 'check_circle', 
    iconBg: '#ff000008', 
    iconColor: '#ff0000',
    borderColor: '#ff000020'
  },
  error: { 
    icon: 'error', 
    iconBg: '#ff000008', 
    iconColor: '#ff0000',
    borderColor: '#ff000020'
  },
  warning: { 
    icon: 'warning', 
    iconBg: '#b355c008', 
    iconColor: '#cf39da',
    borderColor: '#b355c020'
  },
  info: { 
    icon: 'info', 
    iconBg: '#b355c008', 
    iconColor: '#cf39da',
    borderColor: '#b355c020'
  },
};

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 w-[360px] max-w-[90vw]">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="animate-toast-in flex items-start gap-3 rounded-xl bg-white/95 backdrop-blur-sm shadow-card px-4 py-3.5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          [style.border]="'1px solid ' + styleFor(toast.variant).borderColor"
        >
          <span
            class="material-icons flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
            [style.background]="styleFor(toast.variant).iconBg"
            [style.color]="styleFor(toast.variant).iconColor"
          >{{ styleFor(toast.variant).icon }}</span>
          <div class="flex-1 pt-0.5">
            <p class="text-sm font-medium text-black">{{ toast.title }}</p>
            @if (toast.description) {
              <p class="text-sm text-black/50 mt-0.5">{{ toast.description }}</p>
            }
          </div>
          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            class="material-icons text-black/30 hover:text-black/60 transition-all duration-300 text-base mt-0.5 hover:rotate-90"
            aria-label="Dismiss notification"
          >close</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

    * {
      font-family: 'Poppins', sans-serif;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    @keyframes toast-out {
      from {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateX(30px) scale(0.95);
      }
    }

    .animate-toast-in {
      animation: toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .animate-toast-out {
      animation: toast-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .shadow-card {
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .w-\\[360px\\] {
        width: calc(100vw - 2rem) !important;
        max-width: calc(100vw - 2rem) !important;
      }
      
      .fixed.top-5.right-5 {
        right: 1rem;
        top: 1rem;
      }
    }
  `]
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);

  protected styleFor(variant: ToastVariant) {
    return VARIANT_STYLES[variant];
  }
}