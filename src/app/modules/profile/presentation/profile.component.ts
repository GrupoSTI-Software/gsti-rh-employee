import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { AuthPort } from '@modules/auth/domain/auth.port';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
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

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly user = computed(() => this.authPort.getCurrentUser());

  readonly userInitials = computed(() => {
    const user = this.user();
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.name[0].toUpperCase();
  });

  ngOnInit(): void {
    // Simular carga de datos del usuario
    setTimeout(() => {
      this.loading.set(false);
      if (!this.user()) {
        this.error.set('No se pudo cargar la información del usuario');
      }
    }, 500);
  }
}

