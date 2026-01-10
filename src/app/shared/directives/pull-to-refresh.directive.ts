import {
  Directive,
  ElementRef,
  OnInit,
  OnDestroy,
  Renderer2,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Directiva para implementar el gesto de pull-to-refresh (arrastrar hacia abajo para recargar)
 * Similar al comportamiento de los navegadores móviles
 */
@Directive({
  selector: '[appPullToRefresh]',
  standalone: true,
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);

  private startY = 0;
  private currentY = 0;
  private isDragging = false;
  private isRefreshing = false;

  private refreshIndicator: HTMLElement | null = null;
  private readonly THRESHOLD = 80; // Distancia mínima para activar el refresh
  private readonly MAX_PULL = 120; // Máxima distancia de arrastre

  private touchStartHandler: (() => void) | null = null;
  private touchMoveHandler: (() => void) | null = null;
  private touchEndHandler: (() => void) | null = null;

  ngOnInit(): void {
    // Solo inicializar en el navegador, no en SSR
    if (isPlatformBrowser(this.platformId)) {
      this.createRefreshIndicator();
      this.attachEventListeners();
    }
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
    if (this.refreshIndicator) {
      this.refreshIndicator.remove();
    }
  }

  private createRefreshIndicator(): void {
    this.refreshIndicator = this.renderer.createElement('div');
    this.renderer.addClass(this.refreshIndicator, 'pull-to-refresh-indicator');

    const spinner = this.renderer.createElement('div');
    this.renderer.addClass(spinner, 'ptr-spinner');

    const icon = this.renderer.createElement('i');
    this.renderer.addClass(icon, 'pi');
    this.renderer.addClass(icon, 'pi-refresh');

    this.renderer.appendChild(spinner, icon);
    this.renderer.appendChild(this.refreshIndicator, spinner);
    this.renderer.appendChild(document.body, this.refreshIndicator);
  }

  private attachEventListeners(): void {
    this.touchStartHandler = this.renderer.listen(
      this.el.nativeElement,
      'touchstart',
      (e: TouchEvent) => this.onTouchStart(e),
    );

    this.touchMoveHandler = this.renderer.listen(
      this.el.nativeElement,
      'touchmove',
      (e: TouchEvent) => this.onTouchMove(e),
    );

    this.touchEndHandler = this.renderer.listen(this.el.nativeElement, 'touchend', () =>
      this.onTouchEnd(),
    );
  }

  private removeEventListeners(): void {
    if (this.touchStartHandler) this.touchStartHandler();
    if (this.touchMoveHandler) this.touchMoveHandler();
    if (this.touchEndHandler) this.touchEndHandler();
  }

  private onTouchStart(e: TouchEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Solo permitir el gesto cuando el scroll está en la parte superior
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop === 0 && !this.isRefreshing) {
      this.startY = e.touches[0].clientY;
      this.isDragging = true;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || this.isRefreshing) return;

    this.currentY = e.touches[0].clientY;
    const pullDistance = this.currentY - this.startY;

    // Solo procesar si el arrastre es hacia abajo
    if (pullDistance > 0) {
      // Prevenir el scroll por defecto del navegador
      e.preventDefault();

      // Calcular la distancia de arrastre con resistencia
      const dragDistance = Math.min(
        pullDistance * 0.5, // Aplicar resistencia
        this.MAX_PULL,
      );

      this.updateIndicator(dragDistance);
    }
  }

  private onTouchEnd(): void {
    if (!this.isDragging) return;

    const pullDistance = this.currentY - this.startY;

    if (pullDistance >= this.THRESHOLD && !this.isRefreshing) {
      this.triggerRefresh();
    } else {
      this.resetIndicator();
    }

    this.isDragging = false;
    this.startY = 0;
    this.currentY = 0;
  }

  private updateIndicator(distance: number): void {
    if (!this.refreshIndicator) return;

    const opacity = Math.min(distance / this.THRESHOLD, 1);
    const rotation = (distance / this.THRESHOLD) * 360;

    this.renderer.setStyle(this.refreshIndicator, 'transform', `translateY(${distance}px)`);
    this.renderer.setStyle(this.refreshIndicator, 'opacity', opacity.toString());

    const spinner = this.refreshIndicator.querySelector('.ptr-spinner');
    if (spinner) {
      this.renderer.setStyle(spinner, 'transform', `rotate(${rotation}deg)`);
    }
  }

  private resetIndicator(): void {
    if (!this.refreshIndicator) return;

    this.renderer.setStyle(this.refreshIndicator, 'transform', 'translateY(0)');
    this.renderer.setStyle(this.refreshIndicator, 'opacity', '0');

    const spinner = this.refreshIndicator.querySelector('.ptr-spinner');
    if (spinner) {
      this.renderer.setStyle(spinner, 'transform', 'rotate(0deg)');
    }
  }

  private triggerRefresh(): void {
    if (this.isRefreshing || !isPlatformBrowser(this.platformId)) return;

    this.isRefreshing = true;

    if (this.refreshIndicator) {
      this.renderer.addClass(this.refreshIndicator, 'refreshing');
      this.renderer.setStyle(this.refreshIndicator, 'transform', `translateY(${this.THRESHOLD}px)`);
      this.renderer.setStyle(this.refreshIndicator, 'opacity', '1');
    }

    // Simular un pequeño delay para mejor UX antes de recargar
    setTimeout(() => {
      if (isPlatformBrowser(this.platformId)) {
        window.location.reload();
      }
    }, 300);
  }
}
