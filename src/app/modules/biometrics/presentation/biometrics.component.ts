import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-biometrics',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './biometrics.component.html',
  styleUrl: './biometrics.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class BiometricsComponent implements OnInit {
  readonly biometricsEnabled = signal(false);
  readonly biometricAvailable = signal(false);
  readonly deviceSupportsBiometric = signal(false);

  ngOnInit(): void {
    // Verificar soporte de biometría en el navegador
    this.checkBiometricSupport();
  }

  private checkBiometricSupport(): void {
    // En navegadores web, la biometría se maneja mediante WebAuthn API
    if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
      this.deviceSupportsBiometric.set(true);

      // Verificar si ya está habilitado (desde localStorage)
      const enabled = localStorage.getItem('biometrics_enabled') === 'true';
      this.biometricsEnabled.set(enabled);
      this.biometricAvailable.set(enabled);
    } else {
      this.deviceSupportsBiometric.set(false);
    }
  }

  async enableBiometrics(): Promise<void> {
    try {
      // En una implementación real, aquí se usaría la WebAuthn API
      // Por ahora, solo guardamos en localStorage
      localStorage.setItem('biometrics_enabled', 'true');
      this.biometricsEnabled.set(true);
      this.biometricAvailable.set(true);
    } catch (error) {
      console.error('Error al habilitar biometría:', error);
    }
  }

  disableBiometrics(): void {
    localStorage.removeItem('biometrics_enabled');
    this.biometricsEnabled.set(false);
    this.biometricAvailable.set(false);
  }
}

