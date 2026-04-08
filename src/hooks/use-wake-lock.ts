"use client";

import { useEffect, useRef, useCallback } from 'react';

export function useWakeLock(enabled: boolean = true) {
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported in this browser');
      return;
    }

    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      console.log('☀️ Screen Wake Lock is active');
      
      wakeLockRef.current.addEventListener('release', () => {
        console.log('🌙 Screen Wake Lock was released');
      });
    } catch (err: any) {
      console.error(`${err.name}, ${err.message}`);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Re-acquire wake lock if tab becomes visible again
    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible' && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return { requestWakeLock, releaseWakeLock };
}
