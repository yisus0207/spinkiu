'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Employee } from '@/lib/db';
import { 
  Users, 
  ArrowLeft, 
  UserPlus, 
  ShieldAlert, 
  Trash2, 
  Mail, 
  CheckSquare, 
  Square,
  AlertCircle,
  X,
  MailCheck,
  Shield,
  Pencil,
  ShieldCheck,
  ShieldOff
} from 'lucide-react';

export default function EmployeesPage() {
  const router = useRouter();
  const { 
    employees, 
    fetchEmployees, 
    inviteEmployee, 
    updateEmployee,
    deleteEmployee, 
    profile, 
    user,
    isLoading 
  } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [permisos, setPermisos] = useState<string[]>(['dashboard', 'clients']);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Estado para edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPermisos, setEditPermisos] = useState<string[]>([]);
  const [editActivo, setEditActivo] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const isOwner = user?.id === profile?.id;

  if (!isOwner && !isLoading && user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="text-red-500 mb-3" size={48} />
        <h1 className="text-xl font-bold text-zinc-200">Acceso Restringido</h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-sm">
          Solo el dueño original del negocio tiene permisos para administrar y ver la lista de empleados.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const modules = [
    { id: 'dashboard', name: 'Panel Resumen (Dashboard)' },
    { id: 'clients', name: 'Gestión de Clientes' },
    { id: 'billing', name: 'Facturación y Cuenta Corriente' },
    { id: 'inventory', name: 'Control de Inventario' },
    { id: 'evidence', name: 'Evidencias (Fotos)' },
    { id: 'settings', name: 'Ajustes de Negocio' },
  ];

  const handleTogglePermission = (id: string) => {
    if (permisos.includes(id)) {
      setPermisos(permisos.filter(p => p !== id));
    } else {
      setPermisos([...permisos, id]);
    }
  };

  const handleEditTogglePermission = (id: string) => {
    if (editPermisos.includes(id)) {
      setEditPermisos(editPermisos.filter(p => p !== id));
    } else {
      setEditPermisos([...editPermisos, id]);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nombre.trim() || !email.trim()) {
      setFormError('Por favor completa todos los campos.');
      return;
    }

    if (permisos.length === 0) {
      setFormError('Debes asignar al menos un módulo de acceso al empleado.');
      return;
    }

    try {
      await inviteEmployee(nombre, email, permisos);
      
      if (isSupabaseConfigured) {
        setSuccessToast(`📧 Invitación enviada exitosamente al correo: ${email}`);
      } else {
        setSuccessToast(`📧 [Simulado] Invitación enviada al correo: ${email}. Puedes iniciar sesión localmente con este correo.`);
      }

      setIsModalOpen(false);
      setNombre('');
      setEmail('');
      setPermisos(['dashboard', 'clients']);
      
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Error al enviar la invitación.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar a "${name}" del equipo? Perderá acceso inmediato.`)) {
      try {
        await deleteEmployee(id);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar empleado.');
      }
    }
  };

  // --- Edición ---
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditNombre(emp.nombre);
    setEditEmail(emp.email);
    setEditPermisos([...emp.permisos]);
    setEditActivo(emp.activo !== undefined ? emp.activo : true);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editNombre.trim() || !editEmail.trim()) {
      setEditError('Nombre y correo son obligatorios.');
      return;
    }
    if (editPermisos.length === 0) {
      setEditError('Debes asignar al menos un módulo.');
      return;
    }
    if (!editingEmployee) return;

    try {
      await updateEmployee(editingEmployee.id, {
        nombre: editNombre.trim(),
        email: editEmail.trim(),
        permisos: editPermisos,
        activo: editActivo,
      });
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      setSuccessToast(`✅ Colaborador "${editNombre}" actualizado correctamente.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setEditError(err.message || 'Error al guardar cambios.');
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    const newStatus = !(emp.activo !== undefined ? emp.activo : true);
    try {
      await updateEmployee(emp.id, { activo: newStatus });
      setSuccessToast(newStatus ? `✅ ${emp.nombre} ha sido activado.` : `🚫 ${emp.nombre} ha sido bloqueado.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado.');
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col space-y-6">
      
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Ajustes</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 mt-0.5">Equipo de Trabajo</h1>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 shrink-0"
        >
          <UserPlus size={16} />
          <span>Invitar Empleado</span>
        </button>
      </div>

      {/* Alerta de Éxito */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3 shadow-lg"
          >
            <MailCheck className="shrink-0 mt-0.5 animate-bounce" size={18} />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listado de Empleados */}
      <div className="space-y-4">
        {isLoading && employees.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl p-6">
            <Users className="mx-auto text-zinc-600 mb-3" size={32} />
            <p className="text-sm text-zinc-400 font-semibold">No hay empleados registrados</p>
            <p className="text-xs text-zinc-500 mt-1">Invita a tus colaboradores para que gestionen el negocio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees.map((emp) => {
              const isActive = emp.activo !== undefined ? emp.activo : true;
              return (
                <div 
                  key={emp.id}
                  className={`glass-card rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                    isActive 
                      ? 'border-zinc-800/80' 
                      : 'border-red-900/40 bg-red-950/5 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-zinc-100 truncate">{emp.nombre}</h3>
                          {/* Badge de estado */}
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck size={10} />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                              <ShieldOff size={10} />
                              Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                          <Mail size={12} />
                          {emp.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-2 rounded-lg bg-zinc-850 hover:bg-blue-950/30 text-zinc-400 hover:text-blue-400 cursor-pointer transition-colors"
                          title="Editar Colaborador"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id, emp.nombre)}
                          className="p-2 rounded-lg bg-red-950/20 hover:bg-red-950/50 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Eliminar del Equipo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Lista de Permisos */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Permisos de Módulos</span>
                      <div className="flex flex-wrap gap-1.5">
                        {emp.permisos.map((p) => (
                          <span 
                            key={p}
                            className="text-[9px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-md"
                          >
                            {p.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL INVITACIÓN EMPLEADO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full md:max-w-md bg-zinc-900 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-2xl p-6 shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-4 border-b border-zinc-850 pb-3">
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <UserPlus size={18} className="text-blue-400" />
                  Invitar Colaborador
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
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

              <form onSubmit={handleInvite} className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    placeholder="Ej. Andrés Ramírez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    placeholder="empleado@spinkiu.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                {/* Checkboxes de Permisos */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Asignación de Módulos de Acceso</label>
                  <div className="space-y-2 bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                    {modules.map((m) => {
                      const isChecked = permisos.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleTogglePermission(m.id)}
                          className="w-full flex items-center gap-3 py-2 px-1 text-left text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                        >
                          {isChecked ? (
                            <CheckSquare size={16} className="text-blue-400" />
                          ) : (
                            <Square size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                          )}
                          <span>{m.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-zinc-855 hover:bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-center text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                  >
                    Enviar Invitación
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDICIÓN DE EMPLEADO */}
      <AnimatePresence>
        {isEditModalOpen && editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full md:max-w-md bg-zinc-900 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-2xl p-6 shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-4 border-b border-zinc-850 pb-3">
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <Pencil size={18} className="text-blue-400" />
                  Editar Colaborador
                </h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {editError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
                {/* Toggle Activo / Bloqueado */}
                <div className="flex items-center justify-between p-4 rounded-xl border transition-all ${editActivo ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}">
                  <div className="flex items-center gap-3">
                    {editActivo ? (
                      <ShieldCheck size={20} className="text-emerald-400" />
                    ) : (
                      <ShieldOff size={20} className="text-red-400" />
                    )}
                    <div>
                      <span className="text-sm font-bold text-zinc-100 block">
                        {editActivo ? 'Empleado Activo' : 'Empleado Bloqueado'}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {editActivo ? 'Puede acceder a los módulos asignados.' : 'No puede iniciar sesión ni acceder al sistema.'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditActivo(!editActivo)}
                    className={`relative w-12 h-7 rounded-full transition-all cursor-pointer ${
                      editActivo ? 'bg-emerald-500' : 'bg-red-500/60'
                    }`}
                  >
                    <span 
                      className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                        editActivo ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                {/* Checkboxes de Permisos */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Módulos de Acceso</label>
                  <div className="space-y-2 bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                    {modules.map((m) => {
                      const isChecked = editPermisos.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleEditTogglePermission(m.id)}
                          className="w-full flex items-center gap-3 py-2 px-1 text-left text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                        >
                          {isChecked ? (
                            <CheckSquare size={16} className="text-blue-400" />
                          ) : (
                            <Square size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                          )}
                          <span>{m.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 bg-zinc-855 hover:bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-center text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                  >
                    Guardar Cambios
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
