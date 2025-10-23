// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCVBoIl4nVxPOi7qgq1d0wp_n5c4GqygxA",
  authDomain: "calendario-ai-d976e.firebaseapp.com",
  projectId: "calendario-ai-d976e",
  storageBucket: "calendario-ai-d976e.firebasestorage.app",
  messagingSenderId: "233705052175",
  appId: "1:233705052175:web:3adefa53a9c6c429b3ab7a"
});

const messaging = firebase.messaging();

// Gestisce le notifiche quando l'app è in background
messaging.onBackgroundMessage((payload) => {
  console.log('Notifica ricevuta in background:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/calendario-icon.png', // Metteremo questa icona dopo
    badge: '/badge-icon.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.eventId || 'notification',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});