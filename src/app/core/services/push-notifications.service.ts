import { Injectable } from '@angular/core';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private firebaseApp = initializeApp({
    apiKey: 'AIzaSyA_wU8Fj4DT7pPIWHGYbXwqcKbn7IN9CtM',
    authDomain: 'gsti-rh-employee.firebaseapp.com',
    projectId: 'gsti-rh-employee',
    storageBucket: 'gsti-rh-employee.firebasestorage.app',
    messagingSenderId: '52396878988',
    appId: '1:52396878988:web:8001b55392775407e39fa9',
    measurementId: 'G-VMYP8LQKSZ',
  });

  private messaging = getMessaging(this.firebaseApp);

  async requestPermission() {
    const registration = await navigator.serviceWorker.register('assets/firebase-messaging-sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const token = await getToken(this.messaging, {
      vapidKey:
        'BDuF-L5-mAme6e2-Fep4umHY_v1cjf0FtsK0SOhAeqCFn4aBWq3YabnZUtCAzkb7Q5NpShSQtJV20RB6tXDS79I',
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
