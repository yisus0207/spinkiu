'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Building2, User, Sparkles, LogOut, Shield } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, clearSession, userPermissions } = useStore();

  // No mostrar cabecera en el login/auth
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

  // Determinar rol
  // Si el id del usuario coincide con el id del perfil del negocio, es el Administrador/Dueño
  const isOwner = user?.id === profile?.id;
  const roleText = isOwner ? 'Propietario' : 'Colaborador';

  // Título dinámico
  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) return 'Panel Resumen';
    if (pathname.startsWith('/providers')) return 'Mis Proveedores';
    if (pathname.startsWith('/billing/manual')) return 'Factura Manual';
    if (pathname.startsWith('/billing')) return 'Cuentas Corrientes';
    if (pathname.startsWith('/inventory')) return 'Control de Inventario';
    if (pathname.startsWith('/evidence')) return 'Evidencias';
    if (pathname.startsWith('/settings/employees')) return 'Equipo de Trabajo';
    if (pathname.startsWith('/settings')) return 'Ajustes de Negocio';
    return 'Spinkiu';
  };

  return (
    <header className="sticky top-0 no-print z-40 shrink-0">
      {/* BARRA SUPERIOR GLASSMORPHIC */}
      <div className="w-full glass-panel border-b border-white/5 px-4 md:px-8 py-3.5 flex items-center justify-between">

        {/* Título de Página / Logo en móvil */}
        <div className="flex items-center gap-3">
          {/* Logo en Móvil */}
          <div className="md:hidden h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-blue-600/25 overflow-hidden">
            {profile?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logo_url} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Building2 size={17} />
            )}
          </div>
          <div>
            <span className="hidden md:block text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.2em]">Spinkiu</span>
            <h1 className="text-base md:text-lg font-display font-semibold tracking-tight text-slate-50 leading-tight">{getPageTitle()}</h1>
          </div>
        </div>

        {/* Perfil del Usuario / Estado */}
        <div className="flex items-center gap-3">
          {/* Badge de Rol */}
          <span className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border ${
            isOwner
              ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
              : 'bg-white/5 text-slate-400 border-white/10'
          }`}>
            <Shield size={10} />
            {roleText}
          </span>

          {/* Avatar del usuario */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-white/8">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 ring-1 ring-white/10 flex items-center justify-center text-slate-300 text-xs font-semibold shrink-0">
              <User size={15} />
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">{user?.email || 'demo@spinkiu.com'}</span>
              <span className="text-[9px] text-slate-500 truncate">{profile?.nombre_negocio || 'Spinkiu'}</span>
            </div>

            {/* Cerrar sesión rápido en móvil */}
            <button
              onClick={handleLogout}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
