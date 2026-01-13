import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rutas públicas que pueden pre-renderizarse
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'pwa-required',
    renderMode: RenderMode.Prerender,
  },
  // Rutas protegidas - renderizar solo en cliente
  // El authGuard retorna false en SSR, por lo que deben renderizarse en el cliente
  {
    path: 'dashboard/**',
    renderMode: RenderMode.Client,
  },
  // Ruta por defecto
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
