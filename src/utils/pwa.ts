import { useState, useEffect } from 'react';

let deferredInstallPrompt: any = null;

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Register relative sw.js
      const swUrl = './sw.js';
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.info('Folio updated: new version available in background.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('Folio ServiceWorker registration error:', err);
        });
    });

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      window.dispatchEvent(new CustomEvent('folio-pwa-installable'));
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      window.dispatchEvent(new CustomEvent('folio-pwa-installed'));
    });
  }
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(!!deferredInstallPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if running as installed standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsInstalled(isStandalone);

    const handleInstallable = () => setCanInstall(true);
    const handleInstalled = () => {
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('folio-pwa-installable', handleInstallable);
    window.addEventListener('folio-pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('folio-pwa-installable', handleInstallable);
      window.removeEventListener('folio-pwa-installed', handleInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredInstallPrompt) return false;
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        deferredInstallPrompt = null;
        setCanInstall(false);
        return true;
      }
    } catch (err) {
      console.warn('Install prompt failed:', err);
    }
    return false;
  };

  return { canInstall, isInstalled, promptInstall };
}
