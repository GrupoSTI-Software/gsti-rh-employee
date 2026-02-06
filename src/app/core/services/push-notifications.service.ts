import { inject, Injectable } from '@angular/core';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { SecureStorageService } from './secure-storage.service';
//import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly secureStorage = inject(SecureStorageService);
  //private readonly firebaseConfig = environment.FIREBASE_CONFIG;
  private firebaseApp = initializeApp({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
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
