import { Component, inject, signal, OnInit, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { AuthPort } from '@modules/auth/domain/auth.port';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AvatarComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProfileComponent implements OnInit {
  private readonly authPort = inject<AuthPort>(AUTH_PORT);
  private readonly translateService = inject(TranslateService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly copiedField = signal<string | null>(null);

  readonly user = computed(() => this.authPort.getCurrentUser());

  readonly fullName = computed(() => {
    const user = this.user();
    if (!user?.person) return user?.name || user?.email || '';
    const parts: string[] = [];
    if (user.person.personFirstname) parts.push(user.person.personFirstname);
    if (user.person.personLastname) parts.push(user.person.personLastname);
    if (user.person.personSecondLastname) parts.push(user.person.personSecondLastname);
    return parts.length > 0 ? parts.join(' ') : user.email || '';
  });

  readonly seniority = computed(() => {
    const hireDate = this.user()?.person?.employee?.employeeHireDate;
    if (!hireDate) return null;
    return this.calculateSeniority(hireDate);
  });

  constructor() {
    // Efecto para detectar cuando se carga el usuario
    effect(() => {
      const user = this.user();

      if (user && this.loading()) {
        // Usar untracked para escribir signals de forma segura
        untracked(() => {
          this.loading.set(false);
          this.error.set(null);
        });
      }
    });
  }

  ngOnInit(): void {
    // Verificar si el usuario ya está cargado
    if (this.user()) {
      this.loading.set(false);
    } else {
      // Esperar a que se cargue el usuario (puede tardar si viene de la sesión)
      const checkUser = setInterval(() => {
        if (this.user()) {
          this.loading.set(false);
          clearInterval(checkUser);
        }
      }, 100);

      // Timeout de seguridad
      setTimeout(() => {
        clearInterval(checkUser);
        this.loading.set(false);
        if (!this.user()) {
          this.error.set('No se pudo cargar la información del usuario');
        }
      }, 3000);
    }
  }

  /**
   * Calcula el tiempo de antigüedad desde la fecha de ingreso
   */
  private calculateSeniority(hireDate: string): string {
    const hire = new Date(hireDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - hire.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;

    const currentLang = this.translateService.currentLang || 'es';
    const isEnglish = currentLang === 'en';

    const parts: string[] = [];
    if (years > 0) {
      if (isEnglish) {
        parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
      } else {
        parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
      }
    }
    if (months > 0) {
      if (isEnglish) {
        parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
      } else {
        parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
      }
    }
    if (days > 0 && years === 0) {
      if (isEnglish) {
        parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
      } else {
        parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
      }
    }

    if (parts.length > 0) {
      return parts.join(', ');
    }
    return isEnglish ? '0 days' : '0 días';
  }

  /**
   * Formatea una fecha para mostrar según el idioma seleccionado
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '---';
    try {
      const date = new Date(dateString);
      const currentLang = this.translateService.currentLang || 'es';
      const isEnglish = currentLang === 'en';

      if (isEnglish) {
        // Formato en inglés: "December 29, 1995"
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month} ${day}, ${year}`;
      } else {
        // Formato en español: "29 de diciembre de 1995"
        const monthNames = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        return `${day} de ${month} de ${year}`;
      }
    } catch {
      return dateString;
    }
  }

  /**
   * Formatea un número de teléfono removiendo formato
   */
  formatPhoneForCopy(phone: string | undefined): string {
    if (!phone) return '';
    // Remover paréntesis, espacios y guiones
    return phone.replace(/[()\s-]/g, '');
  }

  /**
   * Obtiene el lugar de nacimiento formateado para copiar
   */
  getPlaceOfBirth(): string {
    const user = this.user();
    if (!user?.person) return '---';

    const parts: string[] = [];
    if (user.person.personPlaceOfBirthCity) {
      parts.push(user.person.personPlaceOfBirthCity);
    }
    if (user.person.personPlaceOfBirthState) {
      parts.push(user.person.personPlaceOfBirthState);
    }

    return parts.length > 0 ? parts.join(', ') : '---';
  }

  /**
   * Copia un valor al portapapeles
   */
  async copyToClipboard(value: string, fieldName: string, isPhone: boolean = false): Promise<void> {
    const textToCopy = isPhone ? this.formatPhoneForCopy(value) : value;

    try {
      await navigator.clipboard.writeText(textToCopy);
      this.copiedField.set(fieldName);
      setTimeout(() => {
        this.copiedField.set(null);
      }, 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  }

  /**
   * Maneja el evento de click para copiar al portapapeles
   */
  onClickCopy(event: Event, value: string, fieldName: string, isPhone: boolean = false): void {
    event.preventDefault();
    event.stopPropagation();
    if (!value || value === '---') return;
    this.copyToClipboard(value, fieldName, isPhone);
  }

  /**
   * Maneja el evento de teclado para copiar al portapapeles (accesibilidad)
   */
  onKeyDownCopy(event: KeyboardEvent, value: string, fieldName: string, isPhone: boolean = false): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      if (!value || value === '---') return;
      this.copyToClipboard(value, fieldName, isPhone);
    }
  }
}

