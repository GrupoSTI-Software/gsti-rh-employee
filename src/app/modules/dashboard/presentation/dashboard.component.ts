import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from '@shared/components/header/header.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { PushNotificationsService } from '@core/services/push-notifications.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export default class DashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly pushService = inject(PushNotificationsService);
  private routerSubscription?: Subscription;

  readonly pageTitle = signal<string>('');
  readonly pageSubtitle = signal<string>('');

  /**
   * Obtiene el título de la página actual
   */
  readonly getPageTitle = computed(() => this.pageTitle());

  /**
   * Obtiene el subtítulo de la página actual
   */
  readonly getPageSubtitle = computed(() => this.pageSubtitle());

  ngOnInit(): void {
    this.updatePageTitleFromRoute();
    this.pushService.listen();

    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updatePageTitleFromRoute();
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  /**
   * Actualiza el título y subtítulo según la ruta actual
   */
  private updatePageTitleFromRoute(): void {
    let route = this.router.routerState.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    const routeData = route.snapshot.data;
    const label = routeData['label'] as string;
    const subtitle = routeData['subtitle'] as string;

    this.pageTitle.set(label || 'Dashboard');
    this.pageSubtitle.set(subtitle || '');
  }
}
