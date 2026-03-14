import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import { API } from '../lib/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      const { data } = await axios.get(`${API}/push/vapid-key`);
      const vapidKey = urlBase64ToUint8Array(data.public_key);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      await axios.post(`${API}/push/subscribe`, {
        subscription: subscription.toJSON(),
      });
      return true;
    } catch (e) {
      console.error('Push subscribe error:', e);
      return false;
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await axios.delete(`${API}/push/subscribe`, { data: { endpoint: sub.endpoint } });
          await sub.unsubscribe();
        }
      }
      setPermission('default');
    } catch (e) {
      console.error('Push unsubscribe error:', e);
    }
  }, []);

  return { permission, supported, subscribe, unsubscribe };
}
