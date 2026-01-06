import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { LoginUseCase } from '../application/login.use-case';
import { ThemeService } from '@core/services/theme.service';
import { BrandingService } from '@core/services/branding.service';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LanguageSelectorComponent,
    TranslatePipe
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('fadeInUpDelayed', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out 200ms', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerFadeInUp', [
      transition(':enter', [
        query('.form-group', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true }),
        query('.submit-button', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          animate('400ms ease-out 300ms', style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true })
      ])
    ]),
    trigger('shake', [
      transition('* => *', [
        animate('100ms ease-in-out', style({ transform: 'translateX(-10px)' })),
        animate('100ms ease-in-out', style({ transform: 'translateX(10px)' })),
        animate('100ms ease-in-out', style({ transform: 'translateX(-10px)' })),
        animate('100ms ease-in-out', style({ transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class LoginComponent {
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly translateService = inject(TranslateService);
  readonly theme = inject(ThemeService);
  readonly branding = inject(BrandingService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Logo del branding o logo por defecto
  readonly logoUrl = computed(() =>
    this.branding.getLogoUrl()
  );

  // Mostrar logo solo cuando el branding esté cargado
  readonly showLogo = computed(() =>
    !this.branding.loading() && !!this.branding.settings()
  );

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
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
        this.error.set(
          result.error || this.translateService.instant('auth.invalidCredentials')
        );
      }
    } catch (err) {
      this.error.set(this.translateService.instant('auth.error'));
    } finally {
      this.loading.set(false);
    }
  }
}

