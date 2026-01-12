import { Component, inject, computed, signal, effect, untracked, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { AuthPort } from '@modules/auth/domain/auth.port';
import { environment } from '@env/environment';

export type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  private readonly authPort = inject<AuthPort>(AUTH_PORT);

  // Inputs para personalizar el avatar
  size = input<AvatarSize>('medium');
  showBorder = input<boolean>(false);

  readonly imageError = signal(false);
  private lastPhotoUrl: string | null = null;

  readonly user = computed(() => this.authPort.getCurrentUser());

  /**
   * Construye la URL de la foto del usuario usando el proxy de imágenes
   * Si la foto ya viene como URL completa, la envuelve con el proxy
   */
  readonly userPhoto = computed(() => {
    const photoUrl = this.user()?.person?.employee?.employeePhoto;
    if (photoUrl === null || photoUrl === undefined || photoUrl === '') {
      return null;
    }

    // Si la URL ya incluye el proxy, retornarla tal cual
    if (photoUrl.includes('/proxy-image')) {
      return photoUrl;
    }

    // Construir la URL del proxy
    const apiUrl = environment.apiUrl;
    const encodedUrl = encodeURIComponent(photoUrl);
    return `${apiUrl}/proxy-image?url=${encodedUrl}`;
  });

  readonly userInitials = computed(() => {
    const user = this.user();
    if (!user?.person) {
      if (user?.name === undefined || user.name === '') return 'U';
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return user.name[0].toUpperCase();
    }
    const person = user.person;
    const firstname = person.personFirstname ?? '';
    const lastname = person.personLastname ?? '';
    if (firstname !== '' && lastname !== '') {
      return (firstname[0] + lastname[0]).toUpperCase();
    }
    if (firstname !== '') {
      return firstname[0].toUpperCase();
    }
    return 'U';
  });

  readonly altText = computed(() => {
    const user = this.user();
    if (user?.person) {
      const parts: string[] = [];
      if (user.person.personFirstname) parts.push(user.person.personFirstname);
      if (user.person.personLastname) parts.push(user.person.personLastname);
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
    return user?.name ?? user?.email ?? 'Usuario';
  });

  constructor() {
    // Resetear el error de imagen solo cuando cambia la URL de la foto
    effect(() => {
      const photo = this.userPhoto();

      // Si la URL de la foto cambió, resetear el error para intentar cargarla
      if (photo !== null && photo !== undefined && photo !== this.lastPhotoUrl) {
        this.lastPhotoUrl = photo;
        untracked(() => {
          this.imageError.set(false);
        });
      } else if (photo === null || photo === undefined) {
        // Si no hay foto, asegurar que se muestren las iniciales
        this.lastPhotoUrl = null;
        untracked(() => {
          this.imageError.set(true);
        });
      }
    });
  }

  /**
   * Maneja el error al cargar la imagen (403, 404, CORS, etc.)
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Marcar error para mostrar iniciales
    this.imageError.set(true);
    // Prevenir que el navegador muestre el icono de imagen rota
    img.style.display = 'none';
  }

  /**
   * Maneja la carga exitosa de la imagen
   */
  onImageLoad(): void {
    this.imageError.set(false);
  }
}
