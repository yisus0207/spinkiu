'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Building2, 
  User, 
  MapPin, 
  Phone, 
  FileText, 
  Save, 
  Database, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';

export default function SettingsPage() {
  const { profile, user, updateProfile, fetchProfile } = useStore();
  const isOwner = user?.id === profile?.id;
  
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [nombrePropietario, setNombrePropietario] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nit, setNit] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar datos actuales del perfil
  useEffect(() => {
    if (profile) {
      setNombreNegocio(profile.nombre_negocio || '');
      setNombrePropietario(profile.nombre_propietario || '');
      setDireccion(profile.direccion || '');
      setTelefono(profile.telefono || '');
      setNit(profile.nit || '');
      setLogoUrl(profile.logo_url || '');
    }
  }, [profile]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setLogoUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!nombreNegocio.trim()) {
      setErrorMessage('El nombre del negocio es obligatorio.');
      setIsLoading(false);
      return;
    }

    try {
      await updateProfile({
        nombre_negocio: nombreNegocio,
        nombre_propietario: nombrePropietario,
        direccion,
        telefono,
        nit,
        logo_url: logoUrl,
      });
      setSuccessMessage('¡Configuración guardada exitosamente!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los cambios.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetLocalData = () => {
    if (confirm('¿Estás seguro de que deseas restablecer todos los datos locales? Esto borrará tus clientes, cargos y facturas locales actuales, y los restaurará a los de demostración.')) {
      localStorage.clear();
      // Recargar página para disparar la inicialización
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
      
      {/* Cabecera */}
      <div>
        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Configuración</span>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 mt-0.5">Perfil de Negocio</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Esta información se utilizará para generar y personalizar las facturas.</p>
      </div>

      {/* Tarjeta de Base de Datos y Estado de Sincronización */}
      <div className={`glass-card rounded-2xl p-4 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isSupabaseConfigured 
          ? 'border-emerald-500/20 bg-emerald-500/5' 
          : 'border-amber-500/20 bg-amber-500/5'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isSupabaseConfigured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
          }`}>
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">
              {isSupabaseConfigured ? 'Sincronizado con Supabase Cloud' : 'Almacenamiento Local (Modo Demo)'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-md">
              {isSupabaseConfigured 
                ? `Conectado como: ${user?.email}. Tus datos se guardan y sincronizan en la nube automáticamente.` 
                : 'Tus datos se guardan localmente en el navegador de este dispositivo. Si deseas sincronización multidispositivo, configura las variables de entorno de Supabase.'}
            </p>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <button
            onClick={handleResetLocalData}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold cursor-pointer transition-all self-end md:self-auto"
          >
            <RotateCcw size={14} />
            Restablecer Demo
          </button>
        )}
      </div>

      {/* Tarjeta de Equipo de Trabajo (Visible solo para administradores) */}
      {isOwner && (
        <div className="glass-card rounded-2xl p-4 border border-zinc-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">Equipo de Trabajo</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Invita a tus colaboradores y administra sus permisos de acceso.</p>
            </div>
          </div>
          <Link
            href="/settings/employees"
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer transition-all"
          >
            Administrar Equipo
          </Link>
        </div>
      )}

      {/* Formulario Principal */}
      <div className="glass-card rounded-2xl p-6 md:p-8">
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nombre del Negocio *</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Ej. Spinkiu Tienda"
                value={nombreNegocio}
                onChange={(e) => setNombreNegocio(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nombre del Propietario / Administrador</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Ej. Carlos Gómez"
                value={nombrePropietario}
                onChange={(e) => setNombrePropietario(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">NIT / Identificación Fiscal</label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Ej. 123456-7"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="tel"
                  placeholder="Ej. +502 5555-5555"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Dirección Física</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder="Ej. Calle Principal, Ciudad"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>



          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Logotipo del Negocio</label>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="h-16 w-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 overflow-hidden shrink-0">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 size={24} />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-file-input"
                />
                <label
                  htmlFor="logo-file-input"
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-800 cursor-pointer transition-all"
                >
                  Seleccionar Imagen
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="ml-2 inline-flex items-center px-3 py-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 text-xs font-semibold text-red-400 border border-red-900/30 cursor-pointer transition-all"
                  >
                    Quitar
                  </button>
                )}
                <span className="text-[10px] text-zinc-500 mt-1 block">Sube un archivo de imagen. Se redimensionará automáticamente a un tamaño óptimo.</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 disabled:opacity-50 pt-3"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={18} />
                Guardar Configuración
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
