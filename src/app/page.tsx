'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  Database
} from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { setSession } = useStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [nombrePropietario, setNombrePropietario] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        if (isLogin) {
          // --- LOGIN SUPABASE ---
          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (authError) throw authError;
          if (data.user) {
            await setSession(data.user);
            router.push('/dashboard');
          }
        } else {
          // --- REGISTRO SUPABASE ---
          if (password !== confirmPassword) {
            throw new Error('Las contraseñas no coinciden.');
          }
          if (!nombreNegocio.trim()) {
            throw new Error('El nombre del negocio es requerido.');
          }

          const { data, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                nombre_negocio: nombreNegocio,
                nombre_propietario: nombrePropietario,
              }
            }
          });
          
          if (authError) throw authError;
          
          if (data.user) {
            setError('¡Registro exitoso! Por favor verifica tu correo electrónico para activar tu cuenta e iniciar sesión.');
            setIsLogin(true);
          }
        }
      } else {
        // --- AUTENTICACIÓN LOCAL FALLBACK ---
        if (isLogin) {
          // Aceptar cualquier login en local para fines demostrativos
          if (!email || !password) {
            throw new Error('Por favor completa todos los campos.');
          }
          localStorage.setItem('spinkiu_logged_in', 'true');
          await setSession({ id: 'local-user-uuid-1234', email });
          router.push('/dashboard');
        } else {
          if (password !== confirmPassword) {
            throw new Error('Las contraseñas no coinciden.');
          }
          if (!nombreNegocio) {
            throw new Error('El nombre del negocio es requerido.');
          }
          
          // Guardar negocio en LocalStorage
          const localProfile = {
            id: 'local-user-uuid-1234',
            nombre_negocio: nombreNegocio,
            nombre_propietario: nombrePropietario,
            direccion: '',
            telefono: '',
            nit: '',
            logo_url: '',
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
          localStorage.setItem('spinkiu_profile', JSON.stringify(localProfile));
          localStorage.setItem('spinkiu_logged_in', 'true');
          
          await setSession({ id: 'local-user-uuid-1234', email });
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error en el proceso.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoBypass = async () => {
    setError(null);
    setIsLoading(true);
    try {
      localStorage.setItem('spinkiu_logged_in', 'true');
      await setSession({ id: 'local-user-uuid-1234', email: 'demo@spinkiu.com' });
      router.push('/dashboard');
    } catch (err: any) {
      setError('Error al ingresar al modo demo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-12 overflow-hidden bg-zinc-950">
      {/* Orbes Decorativos */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 flex flex-col items-center">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-3">
            <Sparkles size={28} className="animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
            Spinkiu
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Facturación Acumulativa para Negocios</p>
        </div>

        {/* Tarjeta de Autenticación */}
        <div className="w-full glass-card rounded-2xl p-6 md:p-8">
          {/* Indicador de Estado del Servidor */}
          <div className={`flex items-center gap-2 mb-6 px-3 py-2 rounded-xl text-xs ${
            isSupabaseConfigured 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {isSupabaseConfigured ? (
              <>
                <Database size={14} />
                <span>Base de Datos en Línea (Supabase) Activa</span>
              </>
            ) : (
              <>
                <Database size={14} />
                <span>Modo Local: Guardando datos en el dispositivo</span>
              </>
            )}
          </div>

          <div className="flex border-b border-zinc-800 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                isLogin ? 'border-blue-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                !isLogin ? 'border-blue-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Registrar Negocio
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nombre del Negocio</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="text"
                        placeholder="Ej. Spinkiu Tienda"
                        value={nombreNegocio}
                        onChange={(e) => setNombreNegocio(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nombre del Propietario</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="text"
                        placeholder="Ej. Juan Pérez"
                        value={nombrePropietario}
                        onChange={(e) => setNombrePropietario(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="email"
                  placeholder="propietario@negocio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Confirmar Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 disabled:opacity-50 mt-6"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Ingresar a mi Negocio' : 'Registrar y Comenzar'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Botón de omisión rápido para demostración local si Supabase no está configurado */}
          {!isSupabaseConfigured && (
            <div className="mt-6 pt-6 border-t border-zinc-900 text-center">
              <p className="text-xs text-zinc-500 mb-3">¿Solo quieres probar el sistema?</p>
              <button
                onClick={handleDemoBypass}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold cursor-pointer transition-all"
              >
                <Sparkles size={14} className="text-amber-400" />
                Acceso Rápido Demo (Local)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
