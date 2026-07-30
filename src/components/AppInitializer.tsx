'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Lock } from 'lucide-react';

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setSession, clearSession, user, userPermissions } = useStore();
  const [isReady, setIsReady] = useState(false);

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

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const checkAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        // 1. Caso Supabase: Obtener sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await setSession(session.user);
          // Si está en la raíz y logueado, ir a dashboard
          if (pathname === '/' || pathname === '/login' || pathname === '/register') {
            router.push('/dashboard');
          }
        } else {
          clearSession();
          if (pathname !== '/' && pathname !== '/login' && pathname !== '/register') {
            router.push('/');
          }
        }

        // Suscribirse a cambios de estado de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            await setSession(session.user);
            if (pathname === '/' || pathname === '/login' || pathname === '/register') {
              router.push('/dashboard');
            }
          } else {
            clearSession();
            router.push('/');
          }
        });
        
        unsubscribe = () => subscription.unsubscribe();
      } else {
        // 2. Caso LocalStorage (Demo sin Supabase)
        const isLocalLoggedIn = localStorage.getItem('spinkiu_logged_in') === 'true';
        if (isLocalLoggedIn) {
          await setSession({ id: 'local-user-uuid-1234', email: 'demo@spinkiu.com' });
          if (pathname === '/' || pathname === '/login' || pathname === '/register') {
            router.push('/dashboard');
          }
        } else {
          clearSession();
          if (pathname !== '/' && pathname !== '/login' && pathname !== '/register') {
            router.push('/');
          }
        }
      }
      setIsReady(true);
    };

    checkAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [pathname, router, setSession, clearSession]);

  // Verificar permisos por URL
  const getRequiredPermission = (path: string): string | null => {
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/providers')) return 'clients';
    if (path.startsWith('/billing')) return 'billing';
    if (path.startsWith('/inventory')) return 'inventory';
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
              const firstAllowed = ['dashboard', 'clients', 'billing', 'inventory', 'settings'].find(p => userPermissions.includes(p));
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
