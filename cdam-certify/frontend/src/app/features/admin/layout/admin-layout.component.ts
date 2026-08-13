import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
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
    <div class="shell">
      <!-- Mobile top bar -->
      <header class="mobile-topbar">
        <button type="button" class="menu-btn" (click)="sidebarOpen.set(true)" aria-label="Open navigation">
          <span class="material-icons text-[22px]">menu</span>
        </button>
        <div class="flex items-center gap-2">
          <div class="brand-mark brand-mark--sm">C</div>
          <p class="font-display text-sm font-medium text-black">CDAM Certify</p>
        </div>
        <div class="w-9"></div>
      </header>

      <!-- Backdrop (mobile drawer only) -->
      @if (sidebarOpen()) {
        <div class="backdrop" (click)="sidebarOpen.set(false)"></div>
      }

      <!-- Sidebar -->
      <aside class="sidebar" [class.sidebar--open]="sidebarOpen()">
        <!-- Brand -->
        <div class="sidebar-brand">
          <div class="brand-mark">C</div>
          <div>
            <p class="font-display text-sm font-medium text-black leading-none">CDAM Certify</p>
            <p class="text-xs text-black/40 mt-0.5">Chuka University</p>
          </div>
          <button type="button" class="close-btn" (click)="sidebarOpen.set(false)" aria-label="Close navigation">
            <span class="material-icons text-[20px]">close</span>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active-nav"
              [routerLinkActiveOptions]="{ exact: false }"
              (click)="sidebarOpen.set(false)"
              class="nav-item"
            >
              <span class="material-icons text-[19px]">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
        </nav>

        <!-- User Profile -->
        <div class="sidebar-footer">
          <div class="profile-row">
            <div class="avatar">{{ initials() }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-black truncate">{{ auth.currentUser()?.fullName }}</p>
              <p class="text-xs text-black/40 truncate">{{ auth.currentUser()?.role }}</p>
            </div>
            <button type="button" (click)="logout()" class="logout-btn material-icons" aria-label="Sign out">logout</button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

    :host {
      --brand: #cf39da;
      --brand-soft: #b355c0;
      --brand-tint-04: #b355c004;
      --brand-tint-08: #b355c008;
      --brand-tint-10: #b355c010;
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    * { font-family: 'Poppins', sans-serif; }
    .font-display { font-family: 'Poppins', sans-serif; }

    .shell {
      height: 100vh;
      display: flex;
      overflow: hidden;
      background: var(--brand-tint-04);
    }

    /* ---------- Brand mark ---------- */
    .brand-mark {
      height: 2rem;
      width: 2rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Poppins', sans-serif;
      font-weight: 600;
      font-size: 0.875rem;
      color: #fff;
      background: linear-gradient(135deg, var(--brand-soft), var(--brand));
      transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
      flex-shrink: 0;
    }
    .brand-mark:hover { transform: scale(1.1); }
    .brand-mark--sm { height: 1.75rem; width: 1.75rem; font-size: 0.75rem; }

    /* ---------- Mobile top bar ---------- */
    .mobile-topbar {
      display: none;
      align-items: center;
      justify-content: space-between;
      height: 3.5rem;
      padding: 0 0.75rem;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(6px);
      border-bottom: 1px solid var(--brand-tint-10);
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 30;
    }
    .menu-btn, .close-btn, .logout-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: rgba(0,0,0,0.5);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s, transform 0.2s;
    }
    .menu-btn:hover, .close-btn:hover { color: var(--brand); }
    .logout-btn:hover { color: #dc2626; transform: rotate(90deg); }

    /* ---------- Sidebar ---------- */
    .sidebar {
      width: 16rem;
      flex-shrink: 0;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(6px);
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      border-right: 1px solid var(--brand-tint-10);
    }

    .sidebar-brand {
      height: 4rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0 1.25rem;
      border-bottom: 1px solid var(--brand-tint-10);
    }
    .close-btn { display: none; margin-left: auto; }

    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      overflow-y: auto;
    }
    .sidebar-nav::-webkit-scrollbar { width: 3px; }
    .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
    .sidebar-nav::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, var(--brand-soft), var(--brand));
      border-radius: 2px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-radius: 0.75rem;
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(0,0,0,0.5);
      transition: background 0.25s, color 0.25s, transform 0.2s;
    }
    .nav-item:hover {
      background: var(--brand-tint-08);
      color: var(--brand);
      transform: translateX(2px);
    }

    .active-nav {
      background: linear-gradient(135deg, var(--brand-tint-10), transparent) !important;
      color: var(--brand) !important;
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
      background: linear-gradient(180deg, var(--brand-soft), var(--brand));
    }

    .sidebar-footer {
      padding: 0.75rem;
      border-top: 1px solid var(--brand-tint-10);
    }
    .profile-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      border-radius: 0.75rem;
      padding: 0.5rem;
      transition: background 0.25s;
    }
    .profile-row:hover { background: var(--brand-tint-04); }
    .avatar {
      height: 2rem;
      width: 2rem;
      border-radius: 9999px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, var(--brand-soft), var(--brand));
    }

    /* ---------- Main content ---------- */
    .main-content {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* ---------- Backdrop ---------- */
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 39;
      background: rgba(28,25,23,0.32);
      animation: fade-in 0.2s ease-out both;
    }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

    /* ---------- Responsive: drawer below lg ---------- */
    @media (max-width: 1023px) {
      .mobile-topbar { display: flex; }

      .sidebar {
        position: fixed;
        top: 0; bottom: 0; left: 0;
        z-index: 40;
        width: 17rem;
        max-width: 82vw;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
      }
      .sidebar--open { transform: translateX(0); }

      .close-btn { display: inline-flex; }

      .main-content { padding-top: 3.5rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .sidebar, .backdrop, .brand-mark, .nav-item, .logout-btn {
        transition: none !important;
        animation: none !important;
      }
    }
  `]
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navItems = NAV_ITEMS;
  protected readonly sidebarOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.sidebarOpen.set(false));
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.sidebarOpen()) this.sidebarOpen.set(false);
  }

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