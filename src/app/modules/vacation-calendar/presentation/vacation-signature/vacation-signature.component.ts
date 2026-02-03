import {
  Component,
  inject,
  signal,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  PLATFORM_ID,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { IVacationUsed } from '../../domain/entities/vacation-used.interface';
import { LoggerService } from '@core/services/logger.service';
import SignaturePad from 'signature_pad';
import { trigger, transition, style, animate } from '@angular/animations';
import { Dialog } from 'primeng/dialog';
import { TranslateService } from '@ngx-translate/core';

/**
 * Componente para capturar la firma digital del empleado
 */
@Component({
  selector: 'app-vacation-signature',
  standalone: true,
  imports: [CommonModule, TranslatePipe, Dialog],
  templateUrl: './vacation-signature.component.html',
  styleUrl: './vacation-signature.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [animate('300ms ease-in', style({ transform: 'translateX(100%)' }))]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class VacationSignatureComponent implements AfterViewInit, OnDestroy, OnChanges {
  private readonly logger = inject(LoggerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translateService = inject(TranslateService);

  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;

  @Input() visible = false;
  @Input() vacation: IVacationUsed | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() signatureSubmitted = new EventEmitter<{ signature: Blob; vacation: IVacationUsed }>();

  readonly loading = signal(false);
  readonly hasSignatureData = signal(false);
  readonly showConfirmDialog = signal(false);

  private signaturePad?: SignaturePad;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupSignaturePad();
    }
  }

  ngOnDestroy(): void {
    this.destroySignaturePad();
    this.resizeObserver?.disconnect();
  }

  /**
   * Detecta cambios en el input visible
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      // Cuando el drawer se muestra, reinicializar el signature pad
      setTimeout(() => {
        if (isPlatformBrowser(this.platformId)) {
          this.setupSignaturePad();
        }
      }, 100); // Pequeño delay para que el DOM se actualice
    }
  }

  /**
   * Configura el signature pad
   */
  private setupSignaturePad(): void {
    if (!this.canvasRef?.nativeElement) {
      return;
    }

    // Si ya existe, destruirlo primero
    if (this.signaturePad) {
      this.destroySignaturePad();
    }

    this.initializeSignaturePad();
    this.setupResizeObserver();
  }

  /**
   * Inicializa el signature pad en el canvas
   */
  private initializeSignaturePad(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    // Ajustar el tamaño primero
    this.resizeCanvas();

    // Inicializar SignaturePad
    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1,
      maxWidth: 2.5,
      velocityFilterWeight: 0.7,
    });

    // Escuchar eventos de dibujo para actualizar el estado
    this.signaturePad.addEventListener('beginStroke', () => {
      this.updateSignatureState();
    });

    this.signaturePad.addEventListener('endStroke', () => {
      this.updateSignatureState();
    });

    this.logger.debug('SignaturePad inicializado correctamente');
  }

  /**
   * Configura el observer para redimensionar el canvas
   */
  private setupResizeObserver(): void {
    if (!isPlatformBrowser(this.platformId) || !this.canvasRef?.nativeElement) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });

    this.resizeObserver.observe(this.canvasRef.nativeElement);
  }

  /**
   * Ajusta el tamaño del canvas para que coincida con el contenedor
   */
  private resizeCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    // Guardar el contenido actual si existe
    const data = this.signaturePad?.toData();

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    // Ajustar el tamaño interno del canvas
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    // Escalar el contexto
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    // Ajustar el estilo CSS para que coincida con el tamaño visual
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Restaurar el contenido si existía
    if (data && this.signaturePad) {
      this.signaturePad.fromData(data);
    }
  }

  /**
   * Destruye la instancia del signature pad
   */
  private destroySignaturePad(): void {
    if (this.signaturePad) {
      this.signaturePad.off();
      this.signaturePad = undefined;
    }
  }

  /**
   * Actualiza el estado de la firma
   */
  private updateSignatureState(): void {
    const hasSignature = !this.signaturePad?.isEmpty();
    this.hasSignatureData.set(hasSignature);
    this.cdr.markForCheck();
  }

  /**
   * Cierra el diálogo de firma
   */
  close(): void {
    this.clearSignature();
    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Limpia la firma del canvas
   */
  clearSignature(): void {
    this.signaturePad?.clear();
    this.updateSignatureState();
  }

  /**
   * Verifica si hay una firma en el canvas
   */
  hasSignature(): boolean {
    return this.hasSignatureData();
  }

  /**
   * Convierte un data URL a Blob
   */
  private dataURLtoBlob(dataURL: string): Blob {
    const parts = dataURL.split(',');
    const contentType = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
    const base64 = parts[1];
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], { type: contentType });
  }

  /**
   * Muestra el modal de confirmación antes de enviar la firma
   */
  onConfirmSubmit(): void {
    if (!this.vacation || !this.signaturePad || this.signaturePad.isEmpty()) {
      this.logger.warn('No se puede enviar la firma: faltan datos o la firma está vacía');
      return;
    }
    this.showConfirmDialog.set(true);
  }

  /**
   * Cierra el modal de confirmación
   */
  closeConfirmDialog(): void {
    this.showConfirmDialog.set(false);
  }

  /**
   * Confirma y envía la firma
   */
  async confirmAndSubmitSignature(): Promise<void> {
    this.showConfirmDialog.set(false);
    await this.submitSignature();
  }

  /**
   * Envía la firma
   */
  async submitSignature(): Promise<void> {
    if (!this.vacation || !this.signaturePad || this.signaturePad.isEmpty()) {
      this.logger.warn('No se puede enviar la firma: faltan datos o la firma está vacía');
      return;
    }

    this.loading.set(true);

    try {
      // Obtener la firma como data URL
      const dataUrl = this.signaturePad.toDataURL('image/png');

      // Convertir data URL a Blob (binario)
      const signatureBlob = this.dataURLtoBlob(dataUrl);

      this.signatureSubmitted.emit({
        signature: signatureBlob,
        vacation: this.vacation,
      });

      this.close();
    } catch (error) {
      this.logger.error('Error al procesar la firma:', error);
    } finally {
      this.loading.set(false);
    }
  }
}
