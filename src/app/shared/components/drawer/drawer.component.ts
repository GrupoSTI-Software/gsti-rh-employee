import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss',
  animations: [
    trigger('fadeOverlay', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('250ms ease-in', style({ opacity: 0 }))]),
    ]),
    trigger('slideUpDrawer', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('350ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ transform: 'translateY(100%)' })),
      ]),
    ]),
  ],
})
export class DrawerComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() showHeader = true;
  @Input() showCancelButton = true;
  @Input() cancelButtonText = 'Cancelar';
  @Input() closeOnOverlayClick = true;
  @Input() enableSwipe = true;
  @Input() swipeThreshold = 100;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  private drawerTouchStartY = 0;
  private drawerTouchCurrentY = 0;

  /**
   * Cierra el drawer
   */
  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.closed.emit();
  }

  /**
   * Maneja el click en el overlay
   */
  onOverlayClick(): void {
    if (this.closeOnOverlayClick) {
      this.close();
    }
  }

  /**
   * Maneja el evento touchstart para el swipe del drawer
   */
  onDrawerTouchStart(event: TouchEvent): void {
    if (!this.enableSwipe) return;
    const touch = event.touches[0];
    this.drawerTouchStartY = touch.clientY;
    this.drawerTouchCurrentY = touch.clientY;
  }

  /**
   * Maneja el evento touchmove para el swipe del drawer
   */
  onDrawerTouchMove(event: TouchEvent, drawerElement: HTMLElement): void {
    if (!this.enableSwipe) return;
    const touch = event.touches[0];
    this.drawerTouchCurrentY = touch.clientY;
    const deltaY = this.drawerTouchCurrentY - this.drawerTouchStartY;

    if (deltaY > 0) {
      event.preventDefault();
      drawerElement.style.transform = `translateY(${deltaY}px)`;
      drawerElement.style.transition = 'none';
    }
  }

  /**
   * Maneja el evento touchend para el swipe del drawer
   */
  onDrawerTouchEnd(drawerElement: HTMLElement): void {
    if (!this.enableSwipe) return;
    const deltaY = this.drawerTouchCurrentY - this.drawerTouchStartY;

    drawerElement.style.transition = '';

    if (deltaY > this.swipeThreshold) {
      this.close();
    } else {
      drawerElement.style.transform = '';
    }

    this.drawerTouchStartY = 0;
    this.drawerTouchCurrentY = 0;
  }
}
