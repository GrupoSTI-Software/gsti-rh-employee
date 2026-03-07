import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PwaUpdateService } from '@core/services/pwa-update.service';

/**
 * Componente overlay que notifica al usuario cuando hay una nueva versión
 * de la aplicación disponible. Permite aplicar la actualización de inmediato
 * o descartarla para aplicarla más tarde.
 */
@Component({
  selector: 'app-pwa-update-overlay',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './pwa-update-overlay.component.html',
  styleUrl: './pwa-update-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaUpdateOverlayComponent {
  private readonly pwaUpdate = inject(PwaUpdateService);

  /** Indica si hay una actualización disponible */
  protected readonly updateAvailable = this.pwaUpdate.updateAvailable;

  /**
   * Aplica la actualización disponible y recarga la aplicación
   */
  protected applyUpdate(): void {
    this.pwaUpdate.applyUpdate();
  }

  /**
   * Descarta el aviso de actualización sin aplicarla
   */
  protected dismiss(): void {
    this.pwaUpdate.dismissUpdate();
  }
}
