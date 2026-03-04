import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Ruta de instalación PWA - puede pre-renderizarse (no tiene guard)
  // {
  //   path: 'pwa-required',
  //   renderMode: RenderMode.Prerender,
  // },
  // Login debe renderizarse en cliente porque el pwaGuard necesita
  // verificar el estado de PWA en el navegador
  {
    path: 'login',
    renderMode: RenderMode.Client,
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
