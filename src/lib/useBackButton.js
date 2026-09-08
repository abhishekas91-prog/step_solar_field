import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const ROOTS = new Set(['/', '/login']);

function closeOverlays() {
  if (!document.querySelector('.menu-sheet')) return false;
  document.dispatchEvent(new Event('ss-close-overlays'));
  return true;
}

function goPrevious(navigate, pathname) {
  if (ROOTS.has(pathname || '/')) {
    if (Capacitor.isNativePlatform()) App.exitApp();
    return;
  }
  if (window.history.length > 1) {
    navigate(-1);
    return;
  }
  navigate('/');
}

export default function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const locRef = useRef(location);
  locRef.current = location;

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (closeOverlays()) return;
      goPrevious(navigate, locRef.current.pathname);
    }
    window.addEventListener('keydown', onKey);

    let cancelled = false;
    let handle;
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', () => {
        if (closeOverlays()) return;
        goPrevious(navigate, locRef.current.pathname);
      }).then((h) => {
        if (cancelled) h.remove();
        else handle = h;
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
      handle?.remove();
    };
  }, [navigate]);

  return null;
}
