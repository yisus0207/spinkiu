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
  Boxes
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
    { name: 'Negocio', href: '/settings', icon: Settings, permission: 'settings' },
  ];

  const allowedItems = navItems.filter(item => userPermissions.includes(item.permission));

  return (
    <>
      {/* 1. SIDEBAR DESKTOP (pantallas grandes >= md) */}
      <aside className="no-print hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 glass-panel border-r border-zinc-800 p-4">
        {/* Header del Negocio */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-zinc-800">
          <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
            {profile?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logo_url} alt="Logo" className="h-full w-full object-cover rounded-xl" />
            ) : (
              <Building2 size={20} />
            )}
          </div>
          <div className="overflow-hidden">
            <h2 className="font-semibold text-zinc-100 truncate">{profile?.nombre_negocio || 'Mi Negocio'}</h2>
            <p className="text-xs text-zinc-400 truncate">{profile?.nombre_propietario || 'Propietario'}</p>
          </div>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="flex-1 space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-semibold'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Botón de Cerrar Sesión */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 w-full text-left mt-auto cursor-pointer"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </aside>

      {/* 2. BOTTOM NAV MOBILE */}
      <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 h-16 glass-panel border-t border-zinc-800 flex items-center justify-around px-4 pb-safe z-50">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl tap-highlight-none transition-all duration-200 ${
                isActive 
                  ? 'text-blue-400 scale-105' 
                  : 'text-zinc-500'
              }`}
            >
              <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
              <span className="text-[10px] mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
