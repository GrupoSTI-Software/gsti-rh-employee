import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LoginUseCase } from '../application/login.use-case';
import { BrandingService } from '@core/services/branding.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import packageJson from '../../../../../package.json';

import { PushNotificationsService } from '@core/services/push-notifications.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  providers: [PushNotificationsService],
})
export class LoginComponent {
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly translateService = inject(TranslateService);
  readonly branding = inject(BrandingService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
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
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly version = packageJson.version;
  readonly pushService = inject(PushNotificationsService);
  readonly apiUrl = environment.API_URL;
  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.loginForm.value;

    try {
      const result = await this.loginUseCase.execute(email, password);

      if (result.success) {
        await this.pushService.requestPermission();

        void this.pushService.listen();
        await this.router.navigate(['/dashboard/checkin']);
      } else {
        this.error.set(
          result.error?.length
            ? result.error
            : this.translateService.instant('auth.invalidCredentials'),
        );
      }
    } catch (error) {
      this.error.set(this.translateService.instant('auth.error' + error));
    } finally {
      this.loading.set(false);
    }
  }

  async forgotPassword(): Promise<void> {
    await this.router.navigate(['/forgot-password']);
  }
}
