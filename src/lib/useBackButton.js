import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { closePdfOverlay, isPdfOverlayOpen } from './pdf';

const ROOTS = new Set(['/', '/login']);

function pathKey(loc) {
  return `${loc.pathname || '/'}${loc.search || ''}`;
}

function isRoot(loc) {
  return ROOTS.has(loc.pathname || '/') && !loc.search;
}

function closeOverlays() {
  if (isPdfOverlayOpen()) {
    closePdfOverlay();
    return true;
  }
  if (!document.querySelector('.menu-sheet')) return false;
  document.dispatchEvent(new Event('ss-close-overlays'));
  return true;
}

let backImpl = null;

export function goAppBack(fallback = '/') {
  if (backImpl) {
    backImpl(fallback);
    return;
  }
}

export default function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const locRef = useRef(location);
  const stackRef = useRef([pathKey(location)]);
  const skipPushRef = useRef(false);
  locRef.current = location;

  useEffect(() => {
    const key = pathKey(location);
    if (skipPushRef.current) {
      skipPushRef.current = false;
      const stack = stackRef.current;
      if (stack[stack.length - 1] !== key) stack[Math.max(0, stack.length - 1)] = key;
      return;
    }
    if (isRoot(location)) {
      stackRef.current = [key];
      return;
    }
    const stack = stackRef.current;
    if (navType === 'REPLACE') {
      stack[Math.max(0, stack.length - 1)] = key;
      return;
    }
    if (navType === 'POP') {
      const idx = stack.lastIndexOf(key);
      if (idx >= 0) stackRef.current = stack.slice(0, idx + 1);
      return;
    }
    if (stack[stack.length - 1] !== key) {
      stack.push(key);
      if (stack.length > 40) stack.splice(0, stack.length - 40);
    }
  }, [location, navType]);

  useEffect(() => {
    function goPrevious(fallback = '/') {
      if (closeOverlays()) return;
      const loc = locRef.current;
      if (isRoot(loc)) {
        if (Capacitor.isNativePlatform()) App.exitApp();
        return;
      }
      const stack = stackRef.current;
      if (stack.length > 1) {
        stack.pop();
        skipPushRef.current = true;
        navigate(stack[stack.length - 1] || fallback || '/');
        return;
      }
      skipPushRef.current = true;
      navigate(fallback || '/');
    }

    backImpl = goPrevious;

    function onKey(e) {
      if (e.key !== 'Escape') return;
      goPrevious('/');
    }

    window.addEventListener('keydown', onKey);

    let cancelled = false;
    let handle;
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', () => {
        goPrevious('/');
      }).then((h) => {
        if (cancelled) h.remove();
        else handle = h;
      });
    }

    return () => {
      cancelled = true;
      if (backImpl === goPrevious) backImpl = null;
      window.removeEventListener('keydown', onKey);
      handle?.remove();
    };
  }, [navigate]);

  return null;
}
