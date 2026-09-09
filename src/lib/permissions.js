import { Capacitor } from '@capacitor/core';

async function requestNative() {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();
  } catch {
    /* plugin optional */
  }
  try {
    const { Camera } = await import('@capacitor/camera');
    await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
  } catch {
    /* plugin optional */
  }
}

async function requestWeb() {
  try {
    if (navigator.geolocation) {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          () => resolve(),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
        );
      });
    }
  } catch {
    /* ignore */
  }
  try {
    if (navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
    }
  } catch {
    /* ignore */
  }
}

export async function requestLaunchPermissions() {
  if (Capacitor.isNativePlatform()) {
    await requestNative();
    await requestWeb();
    return;
  }
  await requestWeb();
}
