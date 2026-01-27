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

  readonly resetPasswordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly version = packageJson.version;

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
      const route = inject(ActivatedRoute);
      const token = route.snapshot.paramMap.get('token');
      if (!token) {
        this.error.set('Token is required');
        return;
      }
      const result = await this.resetPasswordUseCase.execute(token, password);
      if (result.success) {
        // Redirigir al dashboard
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
}
