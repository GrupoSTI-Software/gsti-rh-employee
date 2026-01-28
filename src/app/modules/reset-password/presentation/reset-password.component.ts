import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BrandingService } from '@core/services/branding.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import packageJson from '../../../../../package.json';
import { ResetPasswordUseCase } from '../application/reset-password.use-case';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  private readonly resetPasswordUseCase = inject(ResetPasswordUseCase);
  private readonly translateService = inject(TranslateService);
  readonly branding = inject(BrandingService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Logo del branding o logo por defecto
  readonly logoUrl = computed(() => this.branding.getLogoUrl());

  // Mostrar logo solo cuando el branding esté cargado
  readonly showLogo = computed(() => !this.branding.loading() && !!this.branding.settings());

  readonly resetPasswordForm: FormGroup = this.fb.group(
    {
      password: [
        '',
        [Validators.required, Validators.minLength(6)],
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
      ],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
    },
    {
      validators: [this.passwordMatchValidator],
    },
  );

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly version = packageJson.version;
  private readonly route = inject(ActivatedRoute);

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  async onSubmit(): Promise<void> {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { password } = this.resetPasswordForm.value;

    try {
      const token = this.route.snapshot.paramMap.get('token');
      if (!token) {
        this.error.set(this.translateService.instant('auth.tokenRequired'));
        return;
      }
      // validar que la contraseña tenga al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
      if (!this.isValidPassword(password)) {
        this.error.set(this.translateService.instant('auth.passwordPattern'));
        return;
      }
      // validar que la contraseña y la confirmación de contraseña sean iguales
      if (password !== this.resetPasswordForm.get('confirmPassword')?.value) {
        this.error.set(this.translateService.instant('auth.passwordMismatch'));
        return;
      }
      const result = await this.resetPasswordUseCase.execute(token, password);
      if (result.success) {
        await this.router.navigate(['/login']);
      } else {
        const errorMessage =
          result.error !== undefined && result.error.length > 0
            ? result.error
            : this.translateService.instant('auth.error');
        this.error.set(errorMessage);
      }
    } catch (_err) {
      this.error.set(this.translateService.instant('auth.error'));
    } finally {
      this.loading.set(false);
    }
  }

  private passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private isValidPassword(password: string) {
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialCharacter = /[!@#$%^&*()_+\[\]{}|;:,.<>?]/.test(password);
    const isValidLength = password.length >= 8;
    if (hasLowercase && hasUppercase && hasNumber && hasSpecialCharacter && isValidLength) {
      return true;
    } else {
      return false;
    }
  }
}
