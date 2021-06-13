function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const publicVapidKey = 'BP_kDcPEbrsG0j-iiDOL_jRVV75AaRzKQrnYY1uI7YwViIYp18HupbZT6Oek--eAprsvuhVr9v_AS7V0xIoQLFc';

async function triggerPushNotification() {
    // Register Service Worker
    const register = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
    });

    await requestNotificationPermission();
    // Register Push
    const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });

    // Send Push Notification
    await fetch('/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

const requestNotificationPermission = async () => {
    const permission = await window.Notification.requestPermission();
    // value of permission can be 'granted', 'default', 'denied'
    // default: user has dismissed the notification permission popup by clicking on x
    if(permission !== 'granted'){
        throw new Error('Permission not granted for Notification');
    }
}

const triggerPush = document.querySelector('.trigger-push');
triggerPush.addEventListener('click', () => {
    if ('serviceWorker' in navigator) {
        triggerPushNotification().catch(error => console.error(error));
    } else {
        console.error('Service workers are not supported in this browser');
    }
});