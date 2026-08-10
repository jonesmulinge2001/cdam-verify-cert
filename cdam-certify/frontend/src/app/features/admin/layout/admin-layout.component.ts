import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
  { path: '/admin/programs', label: 'Programs', icon: 'school' },
  { path: '/admin/students', label: 'Students', icon: 'groups' },
  { path: '/admin/certificates', label: 'Certificates', icon: 'workspace_premium' },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-screen flex overflow-hidden" style="background: #b355c004;">
      <!-- Sidebar -->
      <aside class="w-64 shrink-0 bg-white/95 backdrop-blur-sm flex flex-col shadow-lg" style="border-right: 1px solid #b355c010;">
        <!-- Brand -->
        <div class="h-16 flex items-center gap-2.5 px-5" style="border-bottom: 1px solid #b355c010;">
          <div class="h-8 w-8 rounded-lg flex items-center justify-center font-display font-semibold text-sm text-white transition-transform duration-300 hover:scale-110" 
               style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);">
            C
          </div>
          <div>
            <p class="font-display text-sm font-medium text-black leading-none">CDAM Certify</p>
            <p class="text-xs text-black/40 mt-0.5">Chuka University</p>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active-nav"
              [routerLinkActiveOptions]="{ exact: false }"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-black/50 transition-all duration-300 hover:scale-105 hover:bg-[#b355c008] hover:text-[#cf39da]"
            >
              <span class="material-icons text-[19px]">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
        </nav>

        <!-- User Profile -->
        <div class="p-3" style="border-top: 1px solid #b355c010;">
          <div class="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all duration-300 hover:bg-[#b355c004]">
            <div class="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white"
                 style="background: linear-gradient(135deg, #ff0000, #cf39da, #b355c0);">
              {{ initials() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-black truncate">{{ auth.currentUser()?.fullName }}</p>
              <p class="text-xs text-black/40 truncate">{{ auth.currentUser()?.role }}</p>
            </div>
            <button
              type="button"
              (click)="logout()"
              class="material-icons text-black/30 hover:text-[#ff0000] transition-all duration-300 text-[19px] hover:rotate-90"
              aria-label="Sign out"
            >logout</button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 min-w-0 overflow-hidden">
        <router-outlet></router-outlet>
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

    /* Prevent scrolling on body */
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    /* Active navigation item */
    .active-nav {
      background: linear-gradient(135deg, #b355c010, #ff000008) !important;
      color: #cf39da !important;
      font-weight: 600;
      position: relative;
    }

    .active-nav::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 24px;
      border-radius: 0 3px 3px 0;
      background: linear-gradient(180deg, #ff0000, #cf39da, #b355c0);
    }

    /* Custom scrollbar for nav */
    nav.overflow-y-auto::-webkit-scrollbar {
      width: 3px;
    }
    nav.overflow-y-auto::-webkit-scrollbar-track {
      background: transparent;
    }
    nav.overflow-y-auto::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #ff0000, #cf39da, #b355c0);
      border-radius: 2px;
    }

    /* Hover effects */
    .hover\\:bg-\\[\\#b355c008\\]:hover {
      background: #b355c008 !important;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .w-64 {
        width: 56px !important;
      }
      
      aside .font-display,
      aside .text-xs,
      aside .text-sm,
      aside .material-icons.text-\\[19px\\],
      aside .flex-1.min-w-0 {
        display: none !important;
      }
      
      aside .flex.items-center.gap-2\\.5 {
        justify-content: center;
        padding: 0.75rem 0;
      }
      
      aside .h-16 {
        height: 3.5rem;
      }
      
      nav.space-y-0\\.5 {
        padding: 0.5rem 0.25rem;
      }
      
      nav a {
        justify-content: center;
        padding: 0.5rem !important;
      }
      
      nav a .material-icons {
        font-size: 1.25rem !important;
      }
      
      .p-3 {
        padding: 0.5rem 0.25rem;
      }
      
      .rounded-xl.px-2.py-2 {
        justify-content: center;
        padding: 0.5rem !important;
      }
    }
  `]
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navItems = NAV_ITEMS;

  protected initials(): string {
    const name = this.auth.currentUser()?.fullName ?? '';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}