import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BrandingService } from '@core/services/branding.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import packageJson from '../../../../../package.json';
import { PincodePasswordUseCase } from '../application/pincode-password.use-case';

@Component({
  selector: 'app-pincode-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './pincode-password.component.html',
  styleUrl: './pincode-password.component.scss',
})
export class PincodePasswordComponent {
  private readonly pincodePasswordUseCase = inject(PincodePasswordUseCase);
  private readonly translateService = inject(TranslateService);
  readonly branding = inject(BrandingService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Logo del branding o logo por defecto
  readonly logoUrl = computed(() => this.branding.getLogoUrl());

  // Mostrar logo solo cuando el branding esté cargado
  readonly showLogo = computed(() => !this.branding.loading() && !!this.branding.settings());

  readonly pincodePasswordForm: FormGroup = this.fb.group({
    otpControls: this.fb.array(
      Array.from({ length: 6 }, () => this.fb.control('', Validators.required)),
    ),
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly version = packageJson.version;

  get otpControls(): FormArray<FormControl<string>> {
    return this.pincodePasswordForm.get('otpControls') as FormArray<FormControl<string>>;
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    this.otpControls.at(index).setValue(input.value);
    if (input.value && index < this.otpControls.length - 1) {
      const next = document.querySelectorAll<HTMLInputElement>('.otp-input')[index + 1];
      next?.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpControls.at(index).value && index > 0) {
      const prev = document.querySelectorAll<HTMLInputElement>('.otp-input')[index - 1];
      prev?.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') ?? '';
    if (!/^\d{6}$/.test(paste)) return;
    paste.split('').forEach((digit, i) => {
      this.otpControls.at(i).setValue(digit);
    });
  }

  async onSubmit(): Promise<void> {
    if (this.pincodePasswordForm.invalid) {
      this.pincodePasswordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const pinCode = this.otpControls.value.join('');

    try {
      const result = await this.pincodePasswordUseCase.execute(pinCode);
      if (result.success) {
        // Redirigir al dashboard
        await this.router.navigate(['/new-password', result.token ?? '']);
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
