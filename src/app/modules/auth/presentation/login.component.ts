import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LoginUseCase } from '../application/login.use-case';
import { LoginWithPasskeyUseCase } from '../application/login-with-passkey.use-case';
import { BrandingService } from '@core/services/branding.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { AUTH_PORT } from '../domain/auth.token';
// eslint-disable-next-line no-restricted-imports
import { PasskeyDemoService } from '../infrastructure/passkey-demo.service';
// eslint-disable-next-line no-restricted-imports
import { PasswordlessWebAuthnAdapter } from '../infrastructure/passwordless-webauthn.adapter';
import packageJson from '../../../../../package.json';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly loginWithPasskeyUseCase = inject(LoginWithPasskeyUseCase);
  private readonly authPort = inject(AUTH_PORT);
  private readonly translateService = inject(TranslateService);
  readonly branding = inject(BrandingService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly passkeyDemoService = inject(PasskeyDemoService);
  private readonly passwordlessAdapter = inject(PasswordlessWebAuthnAdapter);

  // Logo del branding o logo por defecto
  readonly logoUrl = computed(() => this.branding.getLogoUrl());

  // Mostrar logo solo cuando el branding esté cargado
  readonly showLogo = computed(() => !this.branding.loading() && !!this.branding.settings());

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  readonly loading = signal(false);
  readonly loadingPasskey = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly version = packageJson.version;
  readonly passkeySupported = signal(false);
  readonly hasPasskeys = signal(false);
  readonly emailValid = signal(false);

  // El botón aparece si:
  // 1. El navegador soporta Passkeys Y
  // 2. (El usuario tiene Passkeys O hay un email válido en modo desarrollo)
  readonly showPasskeyButton = computed(() => {
    const supported = this.passkeySupported();
    const hasKeys = this.hasPasskeys();
    const validEmail = this.emailValid();

    // DEBUG: Log para ver estado (solo advertencias)
    if (supported && !hasKeys && !validEmail) {
      console.warn('⚠️ Passkeys soportado pero no hay keys ni email válido');
    }

    return supported && (hasKeys || validEmail);
  });

  ngOnInit(): void {
    // Verificar soporte de Passkeys
    const isSupported = this.authPort.isPasskeySupported();
    this.passkeySupported.set(isSupported);

    // DEBUG: Log solo si NO está soportado
    if (!isSupported) {
      console.warn('⚠️ WebAuthn/Passkeys NO soportado en este navegador');
    }

    // Verificar si el email tiene passkeys cuando cambie
    this.loginForm.get('email')?.valueChanges.subscribe((email: string) => {
      const isValid = !!(email && this.isValidEmail(email));
      this.emailValid.set(isValid);

      if (isValid) {
        void this.checkPasskeys(email);
      } else {
        this.hasPasskeys.set(false);
      }
    });

    // Verificar valor inicial del email
    const initialEmail = this.loginForm.get('email')?.value;
    if (initialEmail && this.isValidEmail(initialEmail)) {
      this.emailValid.set(true);
      void this.checkPasskeys(initialEmail);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  /**
   * Verifica si el usuario tiene Passkeys registradas
   */
  private async checkPasskeys(email: string): Promise<void> {
    try {
      const hasPasskeys = await this.authPort.hasPasskeys(email);
      this.hasPasskeys.set(hasPasskeys);
    } catch (error) {
      // Si el backend no está listo, verificar en modo demo
      console.warn('⚠️ Backend no disponible, verificando en modo DEMO', error);

      const hasDemoPasskeys = this.passkeyDemoService.hasPasskeysDemo(email);
      this.hasPasskeys.set(hasDemoPasskeys);
    }
  }

  /**
   * Valida el formato del email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.loginForm.value;

    try {
      const result = await this.loginUseCase.execute(email, password);

      if (result.success) {
        // Redirigir al dashboard
        await this.router.navigate(['/dashboard/checkin']);
      } else {
        const errorMessage =
          result.error !== undefined && result.error.length > 0
            ? result.error
            : this.translateService.instant('auth.invalidCredentials');
        this.error.set(errorMessage);
      }
    } catch (_err) {
      this.error.set(this.translateService.instant('auth.error'));
    } finally {
      this.loading.set(false);
    }
  }
  async forgotPassword(): Promise<void> {
    await this.router.navigate(['/forgot-password']);
  }

  /**
   * Inicia sesión usando Passkey
   */
  async loginWithPasskey(): Promise<void> {
    this.loadingPasskey.set(true);
    this.error.set(null);

    const email = this.loginForm.get('email')?.value;

    try {
      // Intentar autenticación normal primero
      const result = await this.loginWithPasskeyUseCase.execute(email);

      if (result.success) {
        // Redirigir al dashboard
        await this.router.navigate(['/dashboard/checkin']);
      } else {
        const errorMessage =
          result.error !== undefined && result.error.length > 0
            ? result.error
            : this.translateService.instant('auth.passkeyAuthError');
        this.error.set(errorMessage);
      }
    } catch (err) {
      // Si falla, intentar en modo demo
      console.warn('⚠️ Autenticación normal falló, intentando en modo DEMO', err);

      try {
        const demoResult = await this.passkeyDemoService.authenticateDemo(email);

        if (demoResult.success) {
          // En modo demo, simplemente redirigir (en producción no hacer esto)
          await this.router.navigate(['/dashboard/checkin']);
        } else {
          this.error.set(
            demoResult.error ?? this.translateService.instant('auth.passkeyAuthError'),
          );
        }
      } catch {
        this.error.set(this.translateService.instant('auth.passkeyAuthError'));
      }
    } finally {
      this.loadingPasskey.set(false);
    }
  }
}
