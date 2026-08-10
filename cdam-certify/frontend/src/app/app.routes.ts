import { Routes } from '@angular/router';
import { authGuard, superAdminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'verify', pathMatch: 'full' },
  {
    path: 'verify',
    loadComponent: () => import('./features/public/verify/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: 'verify/:certId',
    loadComponent: () => import('./features/public/verify/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'programs',
        loadComponent: () =>
          import('./features/admin/programs/programs.component').then((m) => m.ProgramsComponent),
      },
      {
        path: 'programs/:id',
        loadComponent: () =>
          import('./features/admin/certificates/program-detail.component').then((m) => m.ProgramDetailComponent),
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/admin/students/students.component').then((m) => m.StudentsComponent),
      },
      {
        path: 'certificates',
        loadComponent: () =>
          import('./features/admin/certificates/certificates.component').then((m) => m.CertificatesComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'verify' },
];
