import { inject, Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { SecureStorageService } from './secure-storage.service';
import { LoggerService } from './logger.service';
import { environment } from '@env/environment';

/**
 * Datos de una notificación push recibida en primer plano
 */
export interface IPushNotification {
  title: string;
  body: string;
  noticeId: string;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly secureStorage = inject(SecureStorageService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly logger = inject(LoggerService);

  private firebaseApp = initializeApp({
    apiKey: environment.FIREBASE_API_KEY,
    authDomain: environment.FIREBASE_AUTH_DOMAIN,
    projectId: environment.FIREBASE_PROJECT_ID,
    storageBucket: environment.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: environment.FIREBASE_MESSAGING_SENDER_ID.toString(),
    appId: environment.FIREBASE_APP_ID,
  });

  private messaging = getMessaging(this.firebaseApp);

  /** Notificación activa visible en la UI (null = sin notificación) */
  readonly activeNotification = signal<IPushNotification | null>(null);
  private listening = false;

  /**
   * Obtiene el token FCM y lo almacena en el secure storage
   */
  async getToken(): Promise<string | null> {
    try {
      const registration = await navigator.serviceWorker.register(
        'assets/firebase-messaging-sw.js',
      );
      const token = await getToken(this.messaging, {
        vapidKey: environment.FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      this.secureStorage.setItem('fcmToken', token);
      return token;
    } catch (error) {
      this.logger.error('Error al obtener token FCM:', error);
      return null;
    }
  }

  /**
   * Solicita permiso de notificaciones al usuario
   */
  async requestPermission(): Promise<boolean | void> {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    return true;
  }

  /**
   * Navega al detalle del aviso y limpia la notificación activa
   */
  goToNotice(noticeId: string): void {
    this.activeNotification.set(null);
    void this.router.navigate(['/dashboard/notices', noticeId]);
  }

  /**
   * Cierra la notificación activa sin navegar
   */
  dismissNotification(): void {
    this.activeNotification.set(null);
  }

  /**
   * Escucha mensajes push en primer plano y mensajes del SW (segundo plano).
   * En primer plano muestra una notificación in-app via signal.
   * En segundo plano el SW maneja el click y envía postMessage para navegar.
   */
  listen(): void {
    if (this.listening) return;
    this.listening = true;

    // Mensajes del SW cuando el usuario hace click en una notificación de segundo plano
    navigator.serviceWorker.addEventListener('message', (event) => {
      const noticeId = event.data?.noticeId;
      if (event.data?.type === 'NOTIFICATION_CLICK' && noticeId) {
        this.ngZone.run(() => {
          void this.router.navigate(['/dashboard/notices', noticeId]);
        });
      }
    });

    // Mensajes push en primer plano: mostrar notificación in-app
    onMessage(this.messaging, (payload) => {
      const noticeId = payload.data?.['noticeId'] ?? '';
      const title = payload.notification?.title ?? 'Nuevo aviso';
      const body = payload.notification?.body ?? '';

      this.ngZone.run(() => {
        this.activeNotification.set({ title, body, noticeId });
      });
    });
  }
}
