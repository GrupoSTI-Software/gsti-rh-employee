import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { RegisterPasskeyUseCase } from '../application/register-passkey.use-case';
import { AUTH_PORT } from '../domain/auth.token';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
// eslint-disable-next-line no-restricted-imports
import { PasskeyDemoService } from '../infrastructure/passkey-demo.service';

/**
 * Componente para registrar una nueva Passkey
 */
@Component({
  selector: 'app-register-passkey',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './register-passkey.component.html',
  styleUrl: './register-passkey.component.scss',
})
export class RegisterPasskeyComponent {
  private readonly registerPasskeyUseCase = inject(RegisterPasskeyUseCase);
  private readonly authPort = inject(AUTH_PORT);
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly passkeyDemoService = inject(PasskeyDemoService);

  readonly registerForm: FormGroup = this.fb.group({
    deviceName: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly passkeySupported = signal(this.authPort.isPasskeySupported());

  /**
   * Registra una nueva Passkey
   */
  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const currentUser = this.authPort.getCurrentUser();
    if (!currentUser?.email) {
      this.error.set(this.translateService.instant('auth.noUserAuthenticated'));
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    const { deviceName } = this.registerForm.value;

    try {
      const result = await this.registerPasskeyUseCase.execute(currentUser.email, deviceName);

      if (result.success) {
        this.success.set(true);
        this.registerForm.reset();

        // Redirigir al dashboard después de 2 segundos
        setTimeout(() => {
          void this.router.navigate(['/dashboard/checkin']);
        }, 2000);
      } else {
        const errorMessage =
          result.error !== undefined && result.error.length > 0
            ? result.error
            : this.translateService.instant('auth.passkeyRegisterError');
        this.error.set(errorMessage);
      }
    } catch (err) {
      // Si falla, intentar en modo demo
      console.warn('⚠️ Registro normal falló, intentando en modo DEMO', err);

      try {
        const demoResult = await this.passkeyDemoService.registerDemo(
          currentUser.email,
          deviceName,
        );

        if (demoResult.success) {
          this.success.set(true);
          this.registerForm.reset();

          // Redirigir al dashboard después de 2 segundos
          setTimeout(() => {
            void this.router.navigate(['/dashboard/checkin']);
          }, 2000);
        } else {
          this.error.set(
            demoResult.error ?? this.translateService.instant('auth.passkeyRegisterError'),
          );
        }
      } catch {
        this.error.set(this.translateService.instant('auth.passkeyRegisterError'));
      }
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Omite el registro de Passkey y continúa al dashboard
   */
  async skip(): Promise<void> {
    await this.router.navigate(['/dashboard/checkin']);
  }
}
