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
  Receipt,
  Boxes,
  Camera,
  WifiOff,
} from 'lucide-react';

const inputClass =
  'w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all';

const features = [
  { icon: Receipt, title: 'Facturación acumulativa', desc: 'Cuentas corrientes y liquidaciones por proveedor.', chip: 'Facturación' },
  { icon: Boxes, title: 'Inventario bajo control', desc: 'Stock y catálogo siempre al día.', chip: 'Inventario' },
  { icon: Camera, title: 'Evidencias con foto', desc: 'Registra entregas con fecha, aun sin señal.', chip: 'Evidencias' },
  { icon: WifiOff, title: 'Funciona sin conexión', desc: 'Captura en campo y sincroniza al reconectar.', chip: 'Offline' },
];

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
          const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
          if (authError) throw authError;
          if (data.user) {
            await setSession(data.user);
            router.push('/dashboard');
          }
        } else {
          if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden.');
          if (!nombreNegocio.trim()) throw new Error('El nombre del negocio es requerido.');

          const { data, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { nombre_negocio: nombreNegocio, nombre_propietario: nombrePropietario } },
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
          if (!email || !password) throw new Error('Por favor completa todos los campos.');
          localStorage.setItem('spinkiu_logged_in', 'true');
          await setSession({ id: 'local-user-uuid-1234', email });
          router.push('/dashboard');
        } else {
          if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden.');
          if (!nombreNegocio) throw new Error('El nombre del negocio es requerido.');

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
    } catch {
      setError('Error al ingresar al modo demo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto overflow-x-hidden">
      <div className="min-h-full w-full lg:grid lg:grid-cols-2">
      {/* ===================== PANEL DE MARCA (izquierda, solo desktop) ===================== */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 overflow-hidden bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950">
        {/* Orbes + textura */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-indigo-500/20 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 bg-emerald-500/8 rounded-full blur-[120px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.4] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 30% 30%, #000 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 30% 30%, #000 30%, transparent 100%)',
          }}
        />

        {/* Marca */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 ring-1 ring-white/15">
            <Sparkles size={22} />
          </div>
          <span className="text-2xl font-display font-semibold text-white tracking-tight">Spinkiu</span>
        </div>

        {/* Titular + features */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl xl:text-5xl font-display font-semibold text-white leading-[1.1] tracking-tight">
            Tu negocio,
            <br />
            <span className="text-gradient">bajo control total.</span>
          </h2>
          <p className="text-slate-400 mt-4 text-base leading-relaxed">
            Gestiona proveedores, cuentas corrientes, inventario y evidencias desde un solo lugar — incluso en el campo.
          </p>

          <ul className="mt-10 space-y-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-300 shrink-0 backdrop-blur">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{f.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Pie */}
        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} Spinkiu · Hecho para pequeños negocios.
        </div>
      </aside>

      {/* ===================== PANEL DEL FORMULARIO (derecha) ===================== */}
      <main className="relative flex flex-col justify-center items-center px-4 py-6 min-h-dvh overflow-hidden">
        {/* Orbes suaves detrás del formulario (solo se ven en móvil, donde no hay panel izquierdo) */}
        <div className="absolute top-0 left-1/3 -translate-x-1/2 -translate-y-1/4 w-[24rem] h-[24rem] bg-blue-500/15 rounded-full blur-[110px] pointer-events-none lg:hidden" />
        <div className="absolute bottom-0 right-1/4 translate-x-1/3 translate-y-1/4 w-[22rem] h-[22rem] bg-indigo-500/12 rounded-full blur-[120px] pointer-events-none lg:hidden" />

        <div className="w-full max-w-md z-10 animate-rise">
          {/* Marca (solo móvil, ya que el panel izquierdo está oculto) */}
          <div className="lg:hidden mb-4">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2.5">
                <div className="absolute inset-0 bg-blue-500/40 blur-2xl rounded-full" />
                <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/40 ring-1 ring-white/20">
                  <Sparkles size={24} />
                </div>
              </div>
              <h1 className="text-[1.7rem] leading-none font-display font-semibold tracking-tight text-gradient">Spinkiu</h1>
              <p className="text-xs text-slate-400 mt-1.5 max-w-[15rem]">Facturación, inventario y evidencias.</p>
            </div>

            {/* Chips de funciones */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <span
                    key={f.title}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-300 bg-white/5 border border-white/10 rounded-full px-2.5 py-1"
                  >
                    <Icon size={11} className="text-blue-300" />
                    {f.chip}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Encabezado del formulario (desktop) */}
          <div className="hidden lg:block mb-7">
            <h1 className="text-2xl font-display font-semibold text-slate-50 tracking-tight">
              {isLogin ? 'Bienvenido de nuevo' : 'Crea tu negocio'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {isLogin ? 'Ingresa a tu panel para continuar.' : 'Regístrate y empieza en segundos.'}
            </p>
          </div>

          {/* Tarjeta de Autenticación */}
          <div className="w-full glass-card rounded-3xl p-5 md:p-8">
            {/* Tabs */}
            <div className="relative flex p-1 mb-5 bg-slate-950/60 border border-white/10 rounded-xl">
              <button
                onClick={() => { setIsLogin(true); setError(null); }}
                className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer z-10 ${
                  isLogin ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isLogin && (
                  <motion.span
                    layoutId="authTab"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-600/20 -z-10"
                    transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                  />
                )}
                Iniciar Sesión
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(null); }}
                className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer z-10 ${
                  !isLogin ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {!isLogin && (
                  <motion.span
                    layoutId="authTab"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-600/20 -z-10"
                    transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                  />
                )}
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
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Negocio</label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input type="text" placeholder="Ej. Spinkiu Tienda" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} className={inputClass} required={!isLogin} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Propietario</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input type="text" placeholder="Ej. Juan Pérez" value={nombrePropietario} onChange={(e) => setNombrePropietario(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="email" placeholder="propietario@negocio.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
                </div>
              </div>

              <AnimatePresence>
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Confirmar Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} required={!isLogin} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 disabled:opacity-50 mt-5"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Ingresar a mi Negocio' : 'Registrar y Comenzar'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Acceso demo local */}
            {!isSupabaseConfigured && (
              <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <p className="text-xs text-slate-500 mb-3">¿Solo quieres probar el sistema?</p>
                <button
                  onClick={handleDemoBypass}
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer transition-all"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  Acceso Rápido Demo (Local)
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
