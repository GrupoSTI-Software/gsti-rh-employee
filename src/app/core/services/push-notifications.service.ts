import { inject, Injectable } from '@angular/core';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { SecureStorageService } from './secure-storage.service';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly secureStorage = inject(SecureStorageService);
  private firebaseApp = initializeApp({
    apiKey: environment.FIREBASE_API_KEY,
    authDomain: environment.FIREBASE_AUTH_DOMAIN,
    projectId: environment.FIREBASE_PROJECT_ID,
    storageBucket: environment.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: environment.FIREBASE_MESSAGING_SENDER_ID.toString(),
    appId: environment.FIREBASE_APP_ID,
  });

  private messaging = getMessaging(this.firebaseApp);

  async requestPermission() {
    const registration = await navigator.serviceWorker.register('assets/firebase-messaging-sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const token = await getToken(this.messaging, {
      vapidKey: '',
      serviceWorkerRegistration: registration,
    });
    // Guardar el token en el secure storage
    this.secureStorage.setItem('fcmToken', token);
  }

  listen() {
    onMessage(this.messaging, (payload) => {
      console.log('message received', payload);
    });
  }
}
