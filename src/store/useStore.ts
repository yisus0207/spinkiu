import { create } from 'zustand';
import { db, clearBusinessCache, BusinessProfile, Client, Charge, Invoice, Product, Employee, Evidence } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';

interface AppState {
  user: any | null;
  profile: BusinessProfile | null;
  clients: Client[];
  charges: Record<string, Charge[]>; // client_id -> charges
  invoices: Invoice[];
  products: Product[];
  employees: Employee[];
  evidence: Evidence[];
  userPermissions: string[]; // Módulos a los que se tiene acceso
  isLoading: boolean;
  error: string | null;

  // Acciones de autenticación y carga inicial
  setSession: (sessionUser: any) => Promise<void>;
  clearSession: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<BusinessProfile>) => Promise<void>;
  fetchPermissions: () => Promise<void>;

  // Acciones de Clientes
  fetchClients: () => Promise<void>;
  addClient: (clientData: Omit<Client, 'id' | 'negocio_id' | 'created_at'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Acciones de Cargos
  fetchCharges: (clienteId: string) => Promise<void>;
  addCharge: (chargeData: Omit<Charge, 'id' | 'negocio_id' | 'created_at' | 'invoice_id'>) => Promise<void>;
  deleteCharge: (id: string, clienteId: string) => Promise<void>;

  // Acciones de Facturas
  fetchInvoices: (clienteId?: string) => Promise<void>;
  generateInvoice: (
    clienteId: string,
    items: Array<{ product_id: string | null; descripcion: string; fecha?: string | null; cantidad: number; precio_unitario: number; total: number }>,
    subtotal: number,
    total: number,
    estado: 'pendiente' | 'pagado',
    chargeIds?: string[],
    montoPagado?: number,
    deudaPendiente?: number
  ) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  updateInvoiceStatus: (id: string, estado: 'pendiente' | 'pagado') => Promise<void>;

  // Acciones de Inventario
  fetchProducts: () => Promise<void>;
  addProduct: (prodData: Omit<Product, 'id' | 'negocio_id' | 'created_at'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Acciones de Empleados
  fetchEmployees: () => Promise<void>;
  inviteEmployee: (nombre: string, email: string, permisos: string[]) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Pick<Employee, 'nombre' | 'email' | 'permisos' | 'activo'>>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  // Acciones de Evidencias
  fetchEvidence: () => Promise<void>;
  addEvidence: (data: { cliente_id: string | null; descripcion: string; fotos: string[]; fecha: string }) => Promise<void>;
  deleteEvidence: (id: string) => Promise<void>;
  syncPendingEvidence: () => Promise<void>;
}

// --- Cola de evidencias pendientes (captura offline) ---
const PENDING_EVIDENCE_KEY = 'spinkiu_evidence_pending';
const readPendingEvidence = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PENDING_EVIDENCE_KEY) || '[]');
  } catch {
    return [];
  }
};
const writePendingEvidence = (list: any[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PENDING_EVIDENCE_KEY, JSON.stringify(list));
};

export const useStore = create<AppState>((set, get) => ({
  user: null,
  profile: null,
  clients: [],
  charges: {},
  invoices: [],
  products: [],
  employees: [],
  evidence: [],
  userPermissions: ['dashboard', 'clients'], // Permisos por defecto
  isLoading: false,
  error: null,

  // --- AUTENTICACIÓN & SESIÓN ---
  setSession: async (sessionUser) => {
    clearBusinessCache(); // recalcular el negocio activo para esta sesión
    set({ user: sessionUser, isLoading: true });

    // Cargar permisos cacheados de inmediato (para que la app funcione offline)
    try {
      const cachedPerms = localStorage.getItem('spinkiu_perms');
      if (cachedPerms) set({ userPermissions: JSON.parse(cachedPerms) });
    } catch { /* noop */ }

    try {
      if (!isSupabaseConfigured) {
        // Modo local (LocalStorage): sin red, siempre disponible
        localStorage.setItem('spinkiu_local_user_mail', sessionUser.email || 'demo@spinkiu.com');
        await get().fetchProfile();
        await get().fetchPermissions();
        await get().fetchClients();
        await get().fetchInvoices();
        await get().fetchProducts();
        await get().fetchEmployees();
      } else {
        // Modo Supabase: solo consultar la red si hay conexión (evita cuelgues offline)
        const online = typeof navigator === 'undefined' ? true : navigator.onLine;
        if (online) {
          await get().fetchProfile();
          await get().fetchPermissions();
          await get().fetchClients();
          await get().fetchInvoices();
          await get().fetchProducts();
          await get().fetchEmployees();
        }
        // Sin conexión: se usan los permisos cacheados y los datos se cargan al reconectar
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al inicializar sesión' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearSession: () => {
    clearBusinessCache();
    set({
      user: null,
      profile: null,
      clients: [],
      charges: {},
      invoices: [],
      products: [],
      employees: [],
      evidence: [],
      userPermissions: ['dashboard', 'clients'],
      error: null
    });
    try { localStorage.removeItem('spinkiu_perms'); } catch { /* noop */ }
    if (!isSupabaseConfigured) {
      localStorage.removeItem('spinkiu_local_user_mail');
    }
  },

  fetchProfile: async () => {
    try {
      const profile = await db.getProfile();
      set({ profile });
    } catch (err: any) {
      set({ error: err.message || 'Error al obtener perfil' });
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true });
    try {
      const updated = await db.updateProfile(updates);
      set({ profile: updated });
    } catch (err: any) {
      set({ error: err.message || 'Error al actualizar perfil' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPermissions: async () => {
    try {
      const perms = await db.getMyPermissions();
      if (perms) {
        set({ userPermissions: perms });
        try { localStorage.setItem('spinkiu_perms', JSON.stringify(perms)); } catch { /* noop */ }
      }
    } catch (err: any) {
      console.error('Error al obtener permisos:', err);
    }
  },

  // --- CLIENTES ---
  fetchClients: async () => {
    try {
      const clients = await db.getClients();
      set({ clients });
    } catch (err: any) {
      set({ error: err.message || 'Error al obtener clientes' });
    }
  },

  addClient: async (clientData) => {
    set({ isLoading: true });
    try {
      const newClient = await db.createClient(clientData);
      set((state) => ({
        clients: [...state.clients, newClient].sort((a, b) => a.nombre.localeCompare(b.nombre))
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al crear cliente' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateClient: async (id, updates) => {
    set({ isLoading: true });
    try {
      const updated = await db.updateClient(id, updates);
      set((state) => ({
        clients: state.clients.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.nombre.localeCompare(b.nombre))
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al actualizar cliente' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteClient: async (id) => {
    set({ isLoading: true });
    try {
      await db.deleteClient(id);
      set((state) => {
        const nextCharges = { ...state.charges };
        delete nextCharges[id];
        return {
          clients: state.clients.filter((c) => c.id !== id),
          charges: nextCharges,
          invoices: state.invoices.filter((i) => i.cliente_id !== id)
        };
      });
    } catch (err: any) {
      set({ error: err.message || 'Error al eliminar cliente' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // --- CARGOS ACUMULATIVOS ---
  fetchCharges: async (clienteId) => {
    try {
      const chargesList = await db.getCharges(clienteId);
      set((state) => ({
        charges: {
          ...state.charges,
          [clienteId]: chargesList
        }
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al obtener cargos' });
    }
  },

  addCharge: async (chargeData) => {
    set({ isLoading: true });
    try {
      const newCharge = await db.createCharge(chargeData);
      const clienteId = chargeData.cliente_id;
      set((state) => {
        const currentCharges = state.charges[clienteId] || [];
        return {
          charges: {
            ...state.charges,
            [clienteId]: [newCharge, ...currentCharges]
          }
        };
      });
    } catch (err: any) {
      set({ error: err.message || 'Error al crear cargo' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteCharge: async (id, clienteId) => {
    set({ isLoading: true });
    try {
      await db.deleteCharge(id);
      set((state) => {
        const currentCharges = state.charges[clienteId] || [];
        return {
          charges: {
            ...state.charges,
            [clienteId]: currentCharges.filter((c) => c.id !== id)
          }
        };
      });
    } catch (err: any) {
      set({ error: err.message || 'Error al eliminar cargo' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // --- FACTURAS ---
  fetchInvoices: async (clienteId) => {
    try {
      const invoices = await db.getInvoices(clienteId);
      set((state) => {
        if (clienteId) {
          const otherInvoices = state.invoices.filter((i) => i.cliente_id !== clienteId);
          return { invoices: [...otherInvoices, ...invoices].sort((a, b) => new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime()) };
        }
        return { invoices };
      });
    } catch (err: any) {
      set({ error: err.message || 'Error al obtener facturas' });
    }
  },

  generateInvoice: async (clienteId, items, subtotal, total, estado, chargeIds, montoPagado, deudaPendiente) => {
    set({ isLoading: true });
    try {
      const newInvoice = await db.createInvoice(clienteId, items, subtotal, total, estado, chargeIds, montoPagado, deudaPendiente);
      
      set((state) => ({
        invoices: [newInvoice, ...state.invoices]
      }));
      
      // Sincronizar catálogo de productos e historial del cliente
      await get().fetchProducts();
      await get().fetchCharges(clienteId);
      
      return newInvoice;
    } catch (err: any) {
      set({ error: err.message || 'Error al generar factura' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteInvoice: async (id) => {
    set({ isLoading: true });
    try {
      const invoice = get().invoices.find((i) => i.id === id);
      await db.deleteInvoice(id);
      
      set((state) => ({
        invoices: state.invoices.filter((i) => i.id !== id)
      }));

      // Sincronizar inventario y cargos
      await get().fetchProducts();
      if (invoice) {
        await get().fetchCharges(invoice.cliente_id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al eliminar factura' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateInvoiceStatus: async (id, estado) => {
    set({ isLoading: true });
    try {
      await db.updateInvoiceStatus(id, estado);
      set((state) => ({
        invoices: state.invoices.map((i) => (i.id === id ? { ...i, estado } : i))
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al cambiar estado de factura' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // --- INVENTARIO / PRODUCTOS ---
  fetchProducts: async () => {
    try {
      const list = await db.getProducts();
      set({ products: list });
    } catch (err: any) {
      set({ error: err.message || 'Error al obtener inventario' });
    }
  },

  addProduct: async (prodData) => {
    set({ isLoading: true });
    try {
      const newProduct = await db.createProduct(prodData);
      set((state) => ({
        products: [...state.products, newProduct].sort((a, b) => a.nombre.localeCompare(b.nombre))
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al añadir producto' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProduct: async (id, updates) => {
    set({ isLoading: true });
    try {
      const updated = await db.updateProduct(id, updates);
      set((state) => ({
        products: state.products.map(p => p.id === id ? updated : p).sort((a, b) => a.nombre.localeCompare(b.nombre))
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al actualizar producto' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true });
    try {
      await db.deleteProduct(id);
      set((state) => ({
        products: state.products.filter(p => p.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al eliminar producto' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // --- EMPLEADOS ---
  fetchEmployees: async () => {
    try {
      const list = await db.getEmployees();
      set({ employees: list });
    } catch (err: any) {
      set({ error: err.message || 'Error al obtener empleados' });
    }
  },

  inviteEmployee: async (nombre, email, permisos) => {
    set({ isLoading: true });
    try {
      const newEmp = await db.inviteEmployee(nombre, email, permisos);
      set((state) => ({
        employees: [...state.employees, newEmp]
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al invitar empleado' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteEmployee: async (id) => {
    set({ isLoading: true });
    try {
      await db.deleteEmployee(id);
      set((state) => ({
        employees: state.employees.filter(e => e.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al eliminar empleado' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateEmployee: async (id, updates) => {
    set({ isLoading: true });
    try {
      const updated = await db.updateEmployee(id, updates);
      set((state) => ({
        employees: state.employees.map(e => e.id === id ? updated : e)
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al actualizar empleado' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // --- EVIDENCIAS ---
  fetchEvidence: async () => {
    const pending = readPendingEvidence().map((p) => ({ ...p, _pending: true }));
    try {
      const list = await db.getEvidence();
      set({ evidence: [...pending, ...list] });
    } catch (err: any) {
      // Sin conexión: al menos mostrar las pendientes locales
      set({ evidence: pending });
      set({ error: err.message || 'Error al obtener evidencias' });
    }
  },

  addEvidence: async (data) => {
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    const optimistic: Evidence = {
      id: 'pending-' + Math.random().toString(36).substring(2, 11),
      negocio_id: '',
      cliente_id: data.cliente_id,
      descripcion: data.descripcion,
      foto_url: data.fotos[0] || '',
      fotos: data.fotos,
      fecha: data.fecha,
      created_at: new Date().toISOString(),
      _pending: true,
    };

    // Modo Supabase sin conexión → encolar y mostrar de inmediato
    if (isSupabaseConfigured && !online) {
      const q = readPendingEvidence();
      q.push(optimistic);
      writePendingEvidence(q);
      set((state) => ({ evidence: [optimistic, ...state.evidence] }));
      return;
    }

    set({ isLoading: true });
    try {
      const newEvidence = await db.createEvidence(data);
      set((state) => ({ evidence: [newEvidence, ...state.evidence] }));
    } catch (err: any) {
      if (isSupabaseConfigured) {
        // Falló la red → encolar en lugar de perder la evidencia
        const q = readPendingEvidence();
        q.push(optimistic);
        writePendingEvidence(q);
        set((state) => ({ evidence: [optimistic, ...state.evidence] }));
      } else {
        set({ error: err.message || 'Error al guardar la evidencia' });
        throw err;
      }
    } finally {
      set({ isLoading: false });
    }
  },

  deleteEvidence: async (id) => {
    // Si es una evidencia pendiente (aún no sincronizada), quitarla de la cola
    if (id.startsWith('pending-')) {
      const q = readPendingEvidence().filter((p) => p.id !== id);
      writePendingEvidence(q);
      set((state) => ({ evidence: state.evidence.filter(e => e.id !== id) }));
      return;
    }
    set({ isLoading: true });
    try {
      await db.deleteEvidence(id);
      set((state) => ({
        evidence: state.evidence.filter(e => e.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error al eliminar la evidencia' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  syncPendingEvidence: async () => {
    if (!isSupabaseConfigured) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const q = readPendingEvidence();
    if (q.length === 0) return;

    const remaining: any[] = [];
    for (const p of q) {
      try {
        const created = await db.createEvidence({
          cliente_id: p.cliente_id,
          descripcion: p.descripcion,
          fotos: p.fotos && p.fotos.length ? p.fotos : (p.foto_url ? [p.foto_url] : []),
          fecha: p.fecha,
        });
        // Reemplazar la versión pendiente por la ya sincronizada
        set((state) => ({ evidence: state.evidence.map(e => e.id === p.id ? created : e) }));
      } catch {
        remaining.push(p); // sigue pendiente para el próximo intento
      }
    }
    writePendingEvidence(remaining);
  }
}));

// Nota: el listener de autenticación se maneja en un solo lugar (AppInitializer),
// de forma deferida, para evitar el deadlock del cliente de auth de Supabase.
