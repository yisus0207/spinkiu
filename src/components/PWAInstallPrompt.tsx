'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, Sparkles } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ¿Ya está instalada (abierta como app)? -> no mostrar
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    // ¿El usuario ya la descartó antes? -> no molestar de nuevo
    if (localStorage.getItem('spinkiu_pwa_dismissed') === '1') return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);

    if (ios) {
      // iOS no soporta instalación automática: mostramos instrucciones
      setIsIOS(true);
      setShow(true);
      return;
    }

    // Android / escritorio (Chrome, Edge): capturamos el evento de instalación
    const handler = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* noop */
    }
    setDeferred(null);
    setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem('spinkiu_pwa_dismissed', '1');
    } catch {
      /* noop */
    }
  };

  if (!show) return null;

  return (
    <div className="no-print fixed bottom-0 inset-x-0 z-[60] p-3 md:p-4 flex justify-center pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-md glass-panel border border-white/10 rounded-2xl p-3.5 shadow-2xl flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 ring-1 ring-white/15 shadow-lg shadow-blue-600/25">
          <Sparkles size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-100">Instala Spinkiu</p>
          {isIOS ? (
            <p className="text-[11px] text-slate-400 leading-snug">
              Toca <Share size={11} className="inline -mt-0.5 text-blue-300" /> Compartir y luego{' '}
              <span className="text-slate-300 font-medium">&quot;Agregar a inicio&quot;</span>.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 leading-snug">Añádela a tu pantalla de inicio y úsala como una app.</p>
          )}
        </div>

        {!isIOS && (
          <button
            onClick={install}
            className="shrink-0 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-600/20"
          >
            <Download size={14} />
            Instalar
          </button>
        )}

        <button
          onClick={dismiss}
          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer transition-colors"
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
