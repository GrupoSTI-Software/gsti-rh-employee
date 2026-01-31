import { Injectable } from '@angular/core';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
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
    console.log(token);
  }

  listen() {
    onMessage(this.messaging, (payload) => {
      console.log('Mensaje foreground', payload);
    });
  }
}
