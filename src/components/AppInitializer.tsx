'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Lock } from 'lucide-react';

const isAuthRoute = (p: string) => p === '/' || p === '/login' || p === '/register';

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setSession, clearSession, user, userPermissions } = useStore();
  const [isReady, setIsReady] = useState(false);

  // Referencia siempre actualizada del pathname (para usar dentro de listeners sin re-suscribir)
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Service Worker (offline) + sincronización de evidencias pendientes al reconectar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Registrar el service worker solo en producción (evita interferir con HMR en dev)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Intentar sincronizar evidencias guardadas offline
    const sync = () => {
      useStore.getState().syncPendingEvidence();
    };
    sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);

  // Evitar que la rueda del mouse cambie el valor de los campos numéricos.
  // El número solo se debe modificar escribiendo o borrando.
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement &&
        target.type === 'number' &&
        target === document.activeElement
      ) {
        target.blur();
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: true });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  // Inicialización de sesión (SOLO al montar). Un único listener, deduplicado y
  // deferido para evitar el deadlock del cliente de auth de Supabase.
  useEffect(() => {
    let mounted = true;
    let lastUid: string | null = null; // dedupe: evita recargar si la sesión no cambió

    const handleSession = async (session: any) => {
      const uid = session?.user?.id ?? 'none';
      if (lastUid === uid) {
        if (mounted) setIsReady(true);
        return;
      }
      lastUid = uid;
      try {
        if (session?.user) {
          await setSession(session.user);
          if (mounted && isAuthRoute(pathnameRef.current)) router.push('/dashboard');
        } else {
          clearSession();
          if (mounted && !isAuthRoute(pathnameRef.current)) router.push('/');
        }
      } finally {
        if (mounted) setIsReady(true);
      }
    };

    if (isSupabaseConfigured && supabase) {
      // Carga inicial (sesión local, rápida)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted) handleSession(session);
      });

      // Cambios de sesión: DEFERIR con setTimeout para no llamar a Supabase
      // dentro del callback (evita el deadlock que colgaba la app).
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setTimeout(() => { if (mounted) handleSession(session); }, 0);
      });

      return () => { mounted = false; subscription.unsubscribe(); };
    } else {
      // Modo local (sin Supabase)
      const isLocalLoggedIn = localStorage.getItem('spinkiu_logged_in') === 'true';
      if (isLocalLoggedIn) {
        setSession({ id: 'local-user-uuid-1234', email: 'demo@spinkiu.com' }).finally(() => {
          if (mounted) setIsReady(true);
        });
        if (isAuthRoute(pathnameRef.current)) router.push('/dashboard');
      } else {
        clearSession();
        if (!isAuthRoute(pathnameRef.current)) router.push('/');
        setIsReady(true);
      }
      return () => { mounted = false; };
    }
  }, [router, setSession, clearSession]);

  // Redirigir a login si un usuario no autenticado navega a una ruta protegida
  useEffect(() => {
    if (!isReady) return;
    if (!user && !isAuthRoute(pathname)) router.push('/');
  }, [isReady, user, pathname, router]);

  // Verificar permisos por URL
  const getRequiredPermission = (path: string): string | null => {
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/providers')) return 'clients';
    if (path.startsWith('/billing')) return 'billing';
    if (path.startsWith('/inventory')) return 'inventory';
    if (path.startsWith('/evidence')) return 'evidence';
    if (path.startsWith('/settings')) return 'settings';
    return null;
  };

  const requiredPermission = getRequiredPermission(pathname);
  const hasAccess = !requiredPermission || (user && userPermissions.includes(requiredPermission));

  if (!isReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-zinc-400 font-medium">Cargando aplicación...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex-1 min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        {/* Glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-red-500/10 blur-3xl pointer-events-none"></div>
        
        <div className="glass-panel border border-red-500/20 max-w-sm w-full p-8 rounded-3xl shadow-2xl relative z-10 flex flex-col items-center space-y-6">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
            <Lock size={28} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-zinc-100 tracking-tight">Acceso Restringido</h1>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              No tienes permisos suficientes para acceder al módulo <span className="font-bold text-zinc-200">"{requiredPermission}"</span>.
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Contacta al administrador para solicitar acceso.
            </p>
          </div>
          <button
            onClick={() => {
              const firstAllowed = ['dashboard', 'clients', 'billing', 'inventory', 'evidence', 'settings'].find(p => userPermissions.includes(p));
              if (firstAllowed) {
                router.push(`/${firstAllowed}`);
              } else {
                router.push('/');
              }
            }}
            className="w-full py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-semibold rounded-xl text-xs transition-all cursor-pointer"
          >
            Volver a mi Panel
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
