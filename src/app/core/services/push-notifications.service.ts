import { inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
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

/**
 * Verifica si las APIs de push están disponibles en el navegador actual
 */
function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
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

  private messaging: ReturnType<typeof getMessaging> | null = null;
  private listening = false;

  /**
   * Obtiene la instancia de messaging solo si el navegador lo soporta
   */
  private async getMessagingInstance(): Promise<ReturnType<typeof getMessaging> | null> {
    if (this.messaging) return this.messaging;

    const supported = await isSupported();
    if (!supported) {
      this.logger.warn('Firebase Messaging no es soportado en este navegador');
      return null;
    }

    this.messaging = getMessaging(this.firebaseApp);
    return this.messaging;
  }

  /**
   * Obtiene el token FCM y lo almacena en el secure storage
   */
  async getToken(): Promise<string | null> {
    if (!isPushSupported()) return null;

    try {
      const messaging = await this.getMessagingInstance();
      if (!messaging) return null;

      const registration = await navigator.serviceWorker.register(
        'assets/firebase-messaging-sw.js',
      );
      const token = await getToken(messaging, {
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
    if (!isPushSupported()) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
      return true;
    } catch (error) {
      this.logger.error('Error al solicitar permiso de notificaciones:', error);
      return;
    }
  }

  /**
   * Navega al detalle del aviso
   */
  goToNotice(noticeId: string): void {
    void this.router.navigate(['/dashboard/notices', noticeId]);
  }

  /**
   * Escucha mensajes del SW cuando el usuario hace click en una notificación.
   */
  listen(): void {
    if (this.listening) return;
    this.listening = true;

    if (!isPushSupported()) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const noticeId = event.data?.noticeId;
      if (event.data?.type === 'NOTIFICATION_CLICK' && noticeId) {
        this.ngZone.run(() => {
          void this.router.navigate(['/dashboard/notices', noticeId]);
        });
      }
    });
  }
}
