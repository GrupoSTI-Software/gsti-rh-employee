import { Routes } from '@angular/router';
import { pwaGuard } from '@core/guards/pwa.guard';
import { authGuard } from '@core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('@modules/auth/presentation/login.component').then((m) => m.LoginComponent),
    canActivate: [pwaGuard],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@modules/dashboard/presentation/dashboard.component').then((m) => m.default),
    children: [
      {
        path: 'checkin',
        data: {
          breadcrumb: 'checkin',
          label: 'Asistencia',
        },
        loadComponent: () =>
          import('@modules/attendance/presentation/checkin.component').then(
            (m) => m.CheckinComponent,
          ),
      },
      {
        path: 'vacations',
        data: {
          breadcrumb: 'vacations',
          label: 'Calendario de Vacaciones',
        },
        loadComponent: () =>
          import('@modules/vacation-calendar/presentation/vacation-calendar/vacation-calendar.component').then(
            (m) => m.VacationCalendarComponent,
          ),
      },
      {
        path: 'settings',
        data: {
          breadcrumb: 'settings',
          label: 'Configuración',
        },
        loadComponent: () =>
          import('@modules/settings/presentation/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },
      {
        path: 'profile',
        data: {
          breadcrumb: 'profile',
          label: 'Perfil',
        },
        loadComponent: () =>
          import('@modules/profile/presentation/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: '',
        redirectTo: 'checkin',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'pwa-required',
    loadComponent: () =>
      import('@shared/components/pwa-required/pwa-required.component').then(
        (m) => m.PwaRequiredComponent,
      ),
  },
  {
    path: '',
    redirectTo: '/dashboard/checkin',
    pathMatch: 'full',
  },
];
