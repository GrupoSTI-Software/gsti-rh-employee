import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vacation-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      [attr.style]="'color: ' + color"
    >
      <!-- Icono de maleta/vacaciones -->
      <!-- Cuerpo de la maleta -->
      <path
        d="M7 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7Z"
        [attr.fill]="color"
        [attr.fill-opacity]="0.1"
        [attr.stroke]="color"
        [attr.stroke-width]="1.5"
        [attr.stroke-linecap]="'round'"
        [attr.stroke-linejoin]="'round'"
      />
      <!-- Asa superior -->
      <path
        d="M9 7h6M9 7a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1"
        [attr.stroke]="color"
        [attr.stroke-width]="1.5"
        [attr.stroke-linecap]="'round'"
        [attr.stroke-linejoin]="'round'"
      />
      <!-- Cerradura/centro -->
      <circle cx="12" cy="12" r="1.5" [attr.fill]="color" />
      <!-- Asas laterales -->
      <path
        d="M7 10v4M17 10v4"
        [attr.stroke]="color"
        [attr.stroke-width]="1.5"
        [attr.stroke-linecap]="'round'"
      />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      svg {
        display: block;
      }
    `,
  ],
})
export class VacationIconComponent {
  @Input() size = 24;
  @Input() color = 'currentColor';
}
