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
    if (pathname.startsWith('/settings/employees')) return 'Equipo de Trabajo';
    if (pathname.startsWith('/settings')) return 'Ajustes de Negocio';
    return 'Spinkiu';
  };

  return (
    <header className="relative no-print z-40 shrink-0">
      {/* 1. ORBE DE LUZ SUPERIOR (UI Glow Backdrop) para dar estética y profundidad */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2/3 w-80 h-32 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full blur-[60px] pointer-events-none"></div>

      {/* 2. BARRA DE NAVEGACIÓN SUPERIOR GLASSMORPHIC */}
      <div className="w-full glass-panel border-b border-zinc-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
        
        {/* Título de Página / Logo en móvil */}
        <div className="flex items-center gap-3">
          {/* Logo en Móvil (Visible solo en móvil) */}
          <div className="md:hidden h-8 w-8 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
            {profile?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logo_url} alt="Logo" className="h-full w-full object-cover rounded-lg" />
            ) : (
              <Building2 size={16} />
            )}
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-zinc-100">{getPageTitle()}</h1>
          </div>
        </div>

        {/* Perfil del Usuario / Estado */}
        <div className="flex items-center gap-3">
          {/* Badge de Rol */}
          <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
            isOwner 
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
              : 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
          }`}>
            <Shield size={10} />
            {roleText}
          </span>

          {/* Avatar del usuario con menú contextual simple */}
          <div className="flex items-center gap-2 pl-3 border-l border-zinc-800/80">
            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-400 text-xs font-semibold shrink-0">
              <User size={14} />
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-300 truncate max-w-[120px]">{user?.email || 'demo@spinkiu.com'}</span>
              <span className="text-[9px] text-zinc-500 truncate">{profile?.nombre_negocio || 'Spinkiu'}</span>
            </div>
            
            {/* Cerrar sesión rápido en móvil */}
            <button
              onClick={handleLogout}
              className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
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
