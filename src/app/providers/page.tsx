'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2, 
  X, 
  Phone, 
  MapPin, 
  Notebook, 
  ArrowRight,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

function ProvidersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    clients: providers, 
    fetchClients: fetchProviders, 
    addClient: addProvider, 
    updateClient: updateProvider, 
    deleteClient: deleteProvider,
    isLoading 
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Cargar proveedores al montar
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Si viene con el parámetro ?action=new, abrir el modal de creación
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openCreateModal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openCreateModal = () => {
    setEditingProvider(null);
    setNombre('');
    setTelefono('');
    setDireccion('');
    setObservaciones('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (provider: any) => {
    setEditingProvider(provider);
    setNombre(provider.nombre);
    setTelefono(provider.telefono || '');
    setDireccion(provider.direccion || '');
    setObservaciones(provider.observaciones || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProvider(null);
    if (searchParams.get('action') === 'new') {
      router.replace('/providers');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nombre.trim()) {
      setFormError('El nombre del proveedor es obligatorio.');
      return;
    }

    try {
      if (editingProvider) {
        // Editar
        await updateProvider(editingProvider.id, {
          nombre,
          telefono,
          direccion,
          observaciones,
        });
      } else {
        // Crear
        await addProvider({
          nombre,
          telefono,
          direccion,
          observaciones,
        });
      }
      closeModal();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar proveedor.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar al proveedor "${name}"? Esto también borrará su historial de entregas, adelantos y liquidaciones.`)) {
      try {
        await deleteProvider(id);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar proveedor.');
      }
    }
  };

  // Filtrado de proveedores en base a búsqueda por nombre o teléfono
  const filteredProviders = providers.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(query) ||
      (c.telefono && c.telefono.includes(query))
    );
  });

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col h-full space-y-4">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Base de Datos</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 mt-0.5">Gestión de Proveedores</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 shrink-0"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Nuevo Proveedor</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Buscar proveedor por nombre o teléfono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Listado de Proveedores */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-6">
        {isLoading && providers.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-3 animate-pulse h-32">
                <div className="h-4 bg-zinc-850 rounded-md w-2/3"></div>
                <div className="h-3 bg-zinc-850 rounded-md w-1/3"></div>
                <div className="h-8 bg-zinc-850 rounded-xl w-full mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/20 border border-zinc-800/40 rounded-2xl p-6">
            <Users className="mx-auto text-zinc-600 mb-3" size={32} />
            <p className="text-sm text-zinc-400 font-semibold">No se encontraron proveedores</p>
            <p className="text-xs text-zinc-500 mt-1">Registra un nuevo proveedor para comenzar a registrar entregas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {filteredProviders.map((provider) => (
                <motion.div
                  key={provider.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="glass-card rounded-2xl p-4 flex flex-col justify-between border border-zinc-800/80"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-base text-zinc-100 line-clamp-1">{provider.nombre}</h3>
                    </div>

                    {/* Datos Cortos */}
                    <div className="space-y-1 text-xs text-zinc-400">
                      {provider.telefono && (
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-blue-400/80" />
                          <span>{provider.telefono}</span>
                        </div>
                      )}
                      {provider.direccion && (
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-purple-400/80" />
                          <span className="truncate">{provider.direccion}</span>
                        </div>
                      )}
                      {provider.observaciones && (
                        <div className="flex items-start gap-2 pt-1 border-t border-zinc-900 mt-1">
                          <Notebook size={12} className="text-zinc-500 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-zinc-500 line-clamp-2 leading-normal">{provider.observaciones}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-900 items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(provider)}
                        className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
                        title="Editar Proveedor"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id, provider.nombre)}
                        className="p-2 rounded-lg bg-red-950/20 hover:bg-red-950/50 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                        title="Eliminar Proveedor"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => router.push(`/billing?client=${provider.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      Ver Cuenta Corriente
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR PROVEEDOR */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Ventana Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full md:max-w-md bg-zinc-900 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh] md:max-h-[90vh] z-10 overflow-hidden"
            >
              {/* Header Modal */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-zinc-100">
                  {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nombre Completo *</label>
                  <input
                     type="text"
                     placeholder="Ej. Juan Manuel Restrepo"
                     value={nombre}
                     onChange={(e) => setNombre(e.target.value)}
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                     required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="Ej. +57 311 555-4321"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Dirección</label>
                  <input
                    type="text"
                    placeholder="Ej. Vereda El Hato, Sopó, Cundinamarca"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Observaciones / Notas</label>
                  <textarea
                    placeholder="Notas sobre el proveedor (condiciones de pago, horarios de entrega, etc.)"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                  >
                    Guardar Proveedor
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-zinc-400">Cargando proveedores...</p>
      </div>
    }>
      <ProvidersContent />
    </Suspense>
  );
}
