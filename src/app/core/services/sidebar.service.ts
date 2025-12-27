import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Servicio para manejar el estado del sidebar/drawer
 */
@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly sidebarState = new BehaviorSubject<boolean>(false);
  readonly sidebarState$ = this.sidebarState.asObservable();

  /**
   * Abre o cierra el sidebar
   */
  toggle(): void {
    this.sidebarState.next(!this.sidebarState.value);
  }

  /**
   * Abre el sidebar
   */
  open(): void {
    this.sidebarState.next(true);
  }

  /**
   * Cierra el sidebar
   */
  close(): void {
    this.sidebarState.next(false);
  }

  /**
   * Obtiene el estado actual del sidebar
   */
  get isOpen(): boolean {
    return this.sidebarState.value;
  }
}

