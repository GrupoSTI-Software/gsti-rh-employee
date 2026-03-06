/**
 * EJEMPLO DE USO DEL COMPONENTE ERROR-MODAL
 *
 * Este archivo muestra cómo usar el componente ErrorModalComponent
 * en diferentes escenarios.
 */

import { Component, signal } from '@angular/core';
import { ErrorModalComponent } from './error-modal.component';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [ErrorModalComponent],
  template: `
    <!-- Ejemplo 1: Modal de Error -->
    <button (click)="showErrorModal.set(true)">Mostrar Error</button>
    <app-error-modal
      [visible]="showErrorModal()"
      (visibleChange)="showErrorModal.set($event)"
      type="error"
      title="Error al procesar la solicitud"
      message="No se pudo completar la operación. Por favor, intenta nuevamente."
      closeButtonText="Entendido"
    />

    <!-- Ejemplo 2: Modal de Advertencia -->
    <button (click)="showWarningModal.set(true)">Mostrar Advertencia</button>
    <app-error-modal
      [visible]="showWarningModal()"
      (visibleChange)="showWarningModal.set($event)"
      type="warning"
      title="Advertencia"
      message="Esta acción no se puede deshacer. ¿Estás seguro de continuar?"
      closeButtonText="Aceptar"
    />

    <!-- Ejemplo 3: Modal de Información -->
    <button (click)="showInfoModal.set(true)">Mostrar Información</button>
    <app-error-modal
      [visible]="showInfoModal()"
      (visibleChange)="showInfoModal.set($event)"
      type="info"
      title="Información importante"
      message="Tu sesión expirará en 5 minutos. Por favor, guarda tu trabajo."
      closeButtonText="Entendido"
    />

    <!-- Ejemplo 4: Modal de Éxito -->
    <button (click)="showSuccessModal.set(true)">Mostrar Éxito</button>
    <app-error-modal
      [visible]="showSuccessModal()"
      (visibleChange)="showSuccessModal.set($event)"
      type="success"
      title="Operación exitosa"
      message="Los cambios se han guardado correctamente."
      closeButtonText="Continuar"
    />

    <!-- Ejemplo 5: Modal con evento de cierre -->
    <button (click)="showModalWithEvent.set(true)">Modal con Evento</button>
    <app-error-modal
      [visible]="showModalWithEvent()"
      (visibleChange)="showModalWithEvent.set($event)"
      (closed)="onModalClosed()"
      type="error"
      title="Error de validación"
      message="Por favor, completa todos los campos requeridos."
    />

    <!-- Ejemplo 6: Modal sin botón de cerrar (solo click en overlay) -->
    <button (click)="showMinimalModal.set(true)">Modal Mínimo</button>
    <app-error-modal
      [visible]="showMinimalModal()"
      (visibleChange)="showMinimalModal.set($event)"
      type="info"
      title="Cargando..."
      message="Por favor espera mientras procesamos tu solicitud."
      [showCloseButton]="false"
      [closeOnOverlayClick]="false"
    />
  `,
})
export class ExampleComponent {
  showErrorModal = signal(false);
  showWarningModal = signal(false);
  showInfoModal = signal(false);
  showSuccessModal = signal(false);
  showModalWithEvent = signal(false);
  showMinimalModal = signal(false);

  /**
   * Maneja el evento de cierre del modal
   */
  onModalClosed(): void {
    // Lógica después de cerrar el modal
  }
}

/**
 * EJEMPLO DE USO EN UN SERVICIO O COMPONENTE REAL
 */

// En tu componente TypeScript:
/*
export class MyComponent {
  showErrorModal = signal(false);
  errorTitle = signal('');
  errorMessage = signal('');

  async submitForm(): Promise<void> {
    try {
      // Tu lógica aquí
      await this.myService.save();
    } catch (_error) {
      this.errorTitle.set('Error al guardar');
      this.errorMessage.set('No se pudo guardar la información. Intenta nuevamente.');
      this.showErrorModal.set(true);
    }
  }
}
*/

// En tu template:
/*
<app-error-modal
  [visible]="showErrorModal()"
  (visibleChange)="showErrorModal.set($event)"
  type="error"
  [title]="errorTitle()"
  [message]="errorMessage()"
/>
*/
