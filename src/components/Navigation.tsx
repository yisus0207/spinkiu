'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Home,
  Users,
  ReceiptText,
  Settings,
  LogOut,
  Building2,
  Boxes,
  Camera
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, clearSession, userPermissions } = useStore();

  // No renderizar navegación en la página de login/registro
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return null;
  }

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    clearSession();
    router.push('/');
  };

  const navItems = [
    { name: 'Inicio', href: '/dashboard', icon: Home, permission: 'dashboard' },
    { name: 'Proveedores', href: '/providers', icon: Users, permission: 'clients' },
    { name: 'Inventario', href: '/inventory', icon: Boxes, permission: 'inventory' },
    { name: 'Evidencias', href: '/evidence', icon: Camera, permission: 'evidence' },
    { name: 'Negocio', href: '/settings', icon: Settings, permission: 'settings' },
  ];

  const allowedItems = navItems.filter(item => userPermissions.includes(item.permission));

  return (
    <>
      {/* 1. SIDEBAR DESKTOP (pantallas grandes >= md) */}
      <aside className="no-print hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 glass-panel border-r border-white/5 p-4 z-30">
        {/* Marca / Negocio */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-white/5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-blue-600/25 overflow-hidden">
            {profile?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logo_url} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Building2 size={20} />
            )}
          </div>
          <div className="overflow-hidden">
            <h2 className="font-display font-semibold text-[15px] text-slate-50 truncate leading-tight">{profile?.nombre_negocio || 'Mi Negocio'}</h2>
            <p className="text-[11px] text-slate-400 truncate">{profile?.nombre_propietario || 'Propietario'}</p>
          </div>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="flex-1 space-y-1.5">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/15 to-indigo-500/5 text-blue-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.7)]" />
                )}
                <Icon size={18} className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300 transition-colors'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Botón de Cerrar Sesión */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 w-full text-left mt-auto cursor-pointer"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </aside>

      {/* 2. BOTTOM NAV MOBILE */}
      <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 h-[68px] glass-panel border-t border-white/8 flex items-center justify-around px-3 pb-safe z-50">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-xl tap-highlight-none transition-all duration-200 ${
                isActive
                  ? 'text-blue-400'
                  : 'text-slate-500'
              }`}
            >
              {isActive && (
                <span className="absolute -top-0.5 h-1 w-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
              <Icon size={20} className={isActive ? 'stroke-[2.5px] scale-110 transition-transform' : 'stroke-[2px]'} />
              <span className="text-[10px] mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
