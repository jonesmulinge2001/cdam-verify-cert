import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="animate-fade-up flex flex-col items-center justify-center text-center py-16 px-6">
      <div class="relative">
        <div class="h-20 w-20 rounded-2xl flex items-center justify-center mb-4 mx-auto transition-all duration-500 hover:scale-110 hover:rotate-3"
             style="background: linear-gradient(135deg, #b355c010, #ff000008); border: 1px solid #b355c020;">
          <span class="material-icons text-4xl" style="color: #cf39da;">{{ icon }}</span>
        </div>
        <!-- Subtle glow effect -->
        <div class="absolute -inset-4 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none"
             style="background: radial-gradient(circle, #b355c008, transparent 70%);"></div>
      </div>
      <h3 class="font-display text-lg font-semibold text-black mb-1">{{ title }}</h3>
      <p class="text-sm text-black/50 max-w-sm">{{ description }}</p>
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

    .animate-fade-up {
      animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }

    /* Hover effect for the icon container */
    .relative {
      transition: all 0.3s ease;
    }

    .relative:hover .material-icons {
      animation: icon-bounce 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes icon-bounce {
      0% {
        transform: scale(1);
      }
      30% {
        transform: scale(1.2);
      }
      60% {
        transform: scale(0.9);
      }
      100% {
        transform: scale(1);
      }
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .animate-fade-up {
        animation-duration: 0.4s;
      }
      
      .h-20.w-20 {
        height: 4rem;
        width: 4rem;
      }
      
      .material-icons.text-4xl {
        font-size: 2rem;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Nothing here yet';
  @Input() description = '';
}