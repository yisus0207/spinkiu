import { supabase, isSupabaseConfigured } from './supabase';

export interface BusinessProfile {
  id: string;
  nombre_negocio: string;
  nombre_propietario: string;
  direccion: string;
  telefono: string;
  nit: string;
  logo_url: string; // Almacenará imagen en Base64 o URL
  precio_litro?: number;
  precio_libra?: number;
  precio_unidad?: number;
  updated_at: string;
  created_at: string;
}

export interface Employee {
  id: string;
  negocio_id: string;
  nombre: string;
  email: string;
  permisos: string[]; // e.g. ['dashboard', 'clients', 'billing', 'inventory', 'settings']
  activo: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  negocio_id: string;
  codigo: string;
  nombre: string;
  precio: number;
  stock: number | null; // null = ilimitado (servicio)
  created_at: string;
}

export interface Client {
  id: string;
  negocio_id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  observaciones: string;
  created_at: string;
}

export interface Charge {
  id: string;
  cliente_id: string;
  negocio_id: string;
  descripcion: string;
  monto: number; // Positivo para cargos, negativo para abonos
  fecha: string;
  invoice_id: string | null;
  created_at: string;
  tipo_movimiento?: 'entrada' | 'salida';
  tipo_unidad?: 'litro' | 'libra' | 'unidad' | 'muestra' | null;
  cantidad?: number | null;
  precio_unitario?: number | null;
  solicitado_por?: string | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  descripcion: string;
  fecha?: string | null; // Fecha del movimiento/entrega representado por este ítem
  cantidad: number;
  precio_unitario: number;
  total: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  cliente_id: string;
  negocio_id: string;
  numero_factura: string;
  fecha_emision: string;
  subtotal: number;
  total: number;
  monto_pagado?: number;
  deuda_pendiente?: number;
  estado: 'pendiente' | 'pagado';
  created_at: string;
  // Enriquecidos
  charges?: Charge[];
  items?: InvoiceItem[];
}

export interface Evidence {
  id: string;
  negocio_id: string;
  cliente_id: string | null; // null = evidencia general (sin proveedor)
  descripcion: string;
  foto_url: string; // Portada (primera foto) en Base64 o URL — compatibilidad
  fotos?: string[]; // Todas las fotos de la evidencia
  fecha: string; // Fecha/hora en que se tomó la foto
  created_at: string;
  _pending?: boolean; // Solo en cliente: pendiente de sincronizar (offline)
}

// ID por defecto para local
const LOCAL_USER_ID = 'local-user-uuid-1234';

// Mock Datos Iniciales
const MOCK_PROFILE: BusinessProfile = {
  id: LOCAL_USER_ID,
  nombre_negocio: 'Lechería La Alborada',
  nombre_propietario: 'Don Manuel Restrepo',
  direccion: 'Vereda El Hato, Sopó, Cundinamarca',
  telefono: '+57 311 555-4321',
  nit: '900.123.456-7',
  logo_url: '', // Vacío por defecto
  precio_litro: 3200, // COP 3.200 por litro
  precio_libra: 14000, // COP 14.000 por libra
  precio_unidad: 2500, // COP 2.500 por unidad
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'employee-1',
    negocio_id: LOCAL_USER_ID,
    nombre: 'Eduardo Torres',
    email: 'eduardo@spinkiu.com',
    permisos: ['dashboard', 'clients'], // No tiene acceso a billing ni settings
    activo: true,
    created_at: new Date().toISOString(),
  }
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    negocio_id: LOCAL_USER_ID,
    codigo: 'LCH-01',
    nombre: 'Litro de Leche Entera',
    precio: 3200.00,
    stock: null, // Ilimitado
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    negocio_id: LOCAL_USER_ID,
    codigo: 'QS-01',
    nombre: 'Queso Campesino Libra',
    precio: 14000.00,
    stock: 30,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    negocio_id: LOCAL_USER_ID,
    codigo: 'YG-01',
    nombre: 'Vaso de Yogur 250ml',
    precio: 2500.00,
    stock: 50,
    created_at: new Date().toISOString(),
  }
];

const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    negocio_id: LOCAL_USER_ID,
    nombre: 'Cochera & Quesos de la Sabana',
    telefono: '312-445-6677',
    direccion: 'Calle 4 #8-90, Sopó',
    observaciones: 'Cliente principal, entrega de leche diaria en cantinas.',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'client-2',
    negocio_id: LOCAL_USER_ID,
    nombre: 'Tienda La Esquina',
    telefono: '315-998-7766',
    direccion: 'Carrera 7 #12-34, Briceño',
    observaciones: 'Recibe queso campesino semanal y unidades de yogur.',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_CHARGES: Charge[] = [
  {
    id: 'charge-1-1',
    cliente_id: 'client-1',
    negocio_id: LOCAL_USER_ID,
    descripcion: 'Entrega: 50 Litros de Leche',
    monto: 160000.0, // 50 * 3200
    tipo_movimiento: 'entrada',
    tipo_unidad: 'litro',
    cantidad: 50,
    precio_unitario: 3200,
    fecha: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    invoice_id: null,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'charge-1-2',
    cliente_id: 'client-1',
    negocio_id: LOCAL_USER_ID,
    descripcion: 'Entrega: 40 Litros de Leche',
    monto: 128000.0, // 40 * 3200
    tipo_movimiento: 'entrada',
    tipo_unidad: 'litro',
    cantidad: 40,
    precio_unitario: 3200,
    fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    invoice_id: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'charge-1-3',
    cliente_id: 'client-1',
    negocio_id: LOCAL_USER_ID,
    descripcion: 'Adelanto de efectivo solicitado',
    monto: -100000.0, // Adelanto de dinero (Salida)
    tipo_movimiento: 'salida',
    solicitado_por: 'Administrador del Local',
    fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    invoice_id: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'charge-1-4',
    cliente_id: 'client-1',
    negocio_id: LOCAL_USER_ID,
    descripcion: 'Entrega: 10 Libras de Queso',
    monto: 140000.0, // 10 * 14000
    tipo_movimiento: 'entrada',
    tipo_unidad: 'libra',
    cantidad: 10,
    precio_unitario: 14000,
    fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    invoice_id: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'invoice-1',
    cliente_id: 'client-1',
    negocio_id: LOCAL_USER_ID,
    numero_factura: 'FAC-0001',
    fecha_emision: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    subtotal: 188000.0,
    total: 188000.0,
    estado: 'pagado',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

const MOCK_INVOICE_ITEMS: InvoiceItem[] = [
  {
    id: 'item-1-1',
    invoice_id: 'invoice-1',
    product_id: null,
    descripcion: 'Entrega: 60 Litros de Leche',
    cantidad: 60,
    precio_unitario: 3200.00,
    total: 192000.00,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'item-1-2',
    invoice_id: 'invoice-1',
    product_id: null,
    descripcion: 'Adelanto de efectivo (Solicitado por: Esposa)',
    cantidad: 1,
    precio_unitario: -100000.00,
    total: -100000.00,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'item-1-3',
    invoice_id: 'invoice-1',
    product_id: null,
    descripcion: 'Entrega: 8 Libras de Queso',
    cantidad: 8,
    precio_unitario: 12000.00,
    total: 96000.00,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

// Helper para inicializar LocalStorage
const initializeLocalData = () => {
  if (typeof window === 'undefined') return;
  
  if (!localStorage.getItem('spinkiu_profile')) {
    localStorage.setItem('spinkiu_profile', JSON.stringify(MOCK_PROFILE));
  }
  if (!localStorage.getItem('spinkiu_employees')) {
    localStorage.setItem('spinkiu_employees', JSON.stringify(MOCK_EMPLOYEES));
  }
  if (!localStorage.getItem('spinkiu_products')) {
    localStorage.setItem('spinkiu_products', JSON.stringify(MOCK_PRODUCTS));
  }
  if (!localStorage.getItem('spinkiu_clients')) {
    localStorage.setItem('spinkiu_clients', JSON.stringify(MOCK_CLIENTS));
  }
  if (!localStorage.getItem('spinkiu_charges')) {
    localStorage.setItem('spinkiu_charges', JSON.stringify(MOCK_CHARGES));
  }
  if (!localStorage.getItem('spinkiu_invoices')) {
    localStorage.setItem('spinkiu_invoices', JSON.stringify(MOCK_INVOICES));
  }
  if (!localStorage.getItem('spinkiu_invoice_items')) {
    localStorage.setItem('spinkiu_invoice_items', JSON.stringify(MOCK_INVOICE_ITEMS));
  }
};

// Cache del negocio activo para no repetir consultas en cada operación
let cachedBusinessId: string | null = null;
export const clearBusinessCache = () => { cachedBusinessId = null; };

const getActiveBusinessId = async (): Promise<string> => {
  if (isSupabaseConfigured && supabase) {
    if (cachedBusinessId) return cachedBusinessId;

    // getSession() lee la sesión local (rápido, sin red) en vez de getUser() (red)
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return LOCAL_USER_ID;

    // Verificar una sola vez si es empleado; luego se cachea
    const { data: emp } = await supabase
      .from('employees')
      .select('negocio_id')
      .eq('id', user.id)
      .maybeSingle();

    const businessId: string = emp?.negocio_id || user.id;
    cachedBusinessId = businessId;
    return businessId;
  }
  return LOCAL_USER_ID;
};

// --- STORAGE DE EVIDENCIAS ---
const EVIDENCE_BUCKET = 'evidencias';

// ¿El valor ya es una URL/Base64 (mostrable) o es una ruta de Storage (hay que firmarla)?
const isRemoteOrData = (s: string) => !s || s.startsWith('data:') || s.startsWith('http');

// Convierte un data URL (Base64) a Blob para subirlo a Storage
const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(b64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

export const db = {
  // --- CONFIGURACIÓN DE NEGOCIO / PERFIL ---
  async getProfile(): Promise<BusinessProfile | null> {
    const negocioId = await getActiveBusinessId();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', negocioId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Verificar si es empleado antes de crear perfil
            const { data: emp } = await supabase.from('employees').select('*').eq('id', user.id).single();
            if (emp) {
              const { data: ownerProf } = await supabase.from('profiles').select('*').eq('id', emp.negocio_id).single();
              return ownerProf;
            }

            const newProfile: BusinessProfile = {
              id: user.id,
              nombre_negocio: user.user_metadata.nombre_negocio || 'Mi Negocio',
              nombre_propietario: user.user_metadata.nombre_propietario || '',
              direccion: '',
              telefono: '',
              nit: '',
              logo_url: '',
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            };
            await supabase.from('profiles').insert(newProfile);
            return newProfile;
          }
        }
        return null;
      }
      return data;
    } else {
      initializeLocalData();
      const profileJson = localStorage.getItem('spinkiu_profile');
      return profileJson ? JSON.parse(profileJson) : null;
    }
  },

  async updateProfile(updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const negocioId = await getActiveBusinessId();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', negocioId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      initializeLocalData();
      const profile = await this.getProfile();
      if (!profile) throw new Error('Perfil no encontrado');
      
      const updated = {
        ...profile,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('spinkiu_profile', JSON.stringify(updated));
      return updated;
    }
  },

  // --- EMPLEADOS Y CONTROL DE ACCESO ---
  async getEmployees(): Promise<Employee[]> {
    const negocioId = await getActiveBusinessId();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('negocio_id', negocioId);

      if (error) throw error;
      return data || [];
    } else {
      initializeLocalData();
      const empJson = localStorage.getItem('spinkiu_employees');
      const list: Employee[] = empJson ? JSON.parse(empJson) : [];
      return list.filter(e => e.negocio_id === negocioId);
    }
  },

  async inviteEmployee(nombre: string, email: string, permisos: string[]): Promise<Employee> {
    const negocioId = await getActiveBusinessId();

    if (isSupabaseConfigured && supabase) {
      // Llamada al backend Next.js API para invitaciones seguras con admin SDK
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, permisos, negocioId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al invitar al empleado');
      return data.employee;
    } else {
      initializeLocalData();
      const newEmp: Employee = {
        id: 'employee-' + Math.random().toString(36).substr(2, 9),
        negocio_id: negocioId,
        nombre,
        email,
        permisos,
        activo: true,
        created_at: new Date().toISOString(),
      };
      const empJson = localStorage.getItem('spinkiu_employees');
      const list = empJson ? JSON.parse(empJson) : [];
      list.push(newEmp);
      localStorage.setItem('spinkiu_employees', JSON.stringify(list));
      return newEmp;
    }
  },

  async deleteEmployee(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      initializeLocalData();
      const empJson = localStorage.getItem('spinkiu_employees');
      let list: Employee[] = empJson ? JSON.parse(empJson) : [];
      list = list.filter(e => e.id !== id);
      localStorage.setItem('spinkiu_employees', JSON.stringify(list));
      return true;
    }
  },

  async updateEmployee(id: string, updates: Partial<Pick<Employee, 'nombre' | 'email' | 'permisos' | 'activo'>>): Promise<Employee> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      initializeLocalData();
      const empJson = localStorage.getItem('spinkiu_employees');
      let list: Employee[] = empJson ? JSON.parse(empJson) : [];
      list = list.map(e => e.id === id ? { ...e, ...updates } : e);
      localStorage.setItem('spinkiu_employees', JSON.stringify(list));
      const updated = list.find(e => e.id === id);
      if (!updated) throw new Error('Empleado no encontrado');
      return updated;
    }
  },

  // Obtiene los permisos del usuario activo
  async getMyPermissions(): Promise<string[] | null> {
    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Intentar obtener de tabla employees
      const { data: employee } = await supabase
        .from('employees')
        .select('permisos, activo')
        .eq('id', user.id)
        .single();
      
      if (employee) {
        if (employee.activo === false) {
          return []; // Retornar vacío si está bloqueado/desactivado
        }
        return employee.permisos;
      }
      // Si es dueño del negocio, tiene acceso total
      return ['dashboard', 'clients', 'billing', 'inventory', 'evidence', 'settings'];
    } else {
      const isLocalLoggedIn = localStorage.getItem('spinkiu_logged_in') === 'true';
      if (!isLocalLoggedIn) return null;
      
      const localUserMail = localStorage.getItem('spinkiu_local_user_mail') || 'demo@spinkiu.com';
      if (localUserMail === 'demo@spinkiu.com') {
        // Acceso total
        return ['dashboard', 'clients', 'billing', 'inventory', 'evidence', 'settings'];
      }
      
      // Buscar en empleados locales
      initializeLocalData();
      const empJson = localStorage.getItem('spinkiu_employees');
      const list: Employee[] = empJson ? JSON.parse(empJson) : [];
      const emp = list.find(e => e.email === localUserMail);
      if (emp) {
        if (emp.activo === false) {
          return []; // Retornar vacío si está bloqueado/desactivado
        }
        return emp.permisos;
      }
      return ['dashboard', 'clients']; // default permissions
    }
  },

  // --- INVENTARIO / PRODUCTOS ---
  async getProducts(): Promise<Product[]> {
    const negocioId = await getActiveBusinessId();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('nombre', { ascending: true });

      if (error) throw error;
      return data || [];
    } else {
      initializeLocalData();
      const prodJson = localStorage.getItem('spinkiu_products');
      const list: Product[] = prodJson ? JSON.parse(prodJson) : [];
      return list.filter(p => p.negocio_id === negocioId).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  },

  async createProduct(prodData: Omit<Product, 'id' | 'negocio_id' | 'created_at'>): Promise<Product> {
    const negocioId = await getActiveBusinessId();
    const newProduct: Product = {
      id: isSupabaseConfigured ? undefined as any : 'prod-' + Math.random().toString(36).substr(2, 9),
      negocio_id: negocioId,
      ...prodData,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .insert(newProduct)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      initializeLocalData();
      const prodJson = localStorage.getItem('spinkiu_products');
      const list = prodJson ? JSON.parse(prodJson) : [];
      list.push(newProduct);
      localStorage.setItem('spinkiu_products', JSON.stringify(list));
      return newProduct;
    }
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      initializeLocalData();
      const prodJson = localStorage.getItem('spinkiu_products');
      let list: Product[] = prodJson ? JSON.parse(prodJson) : [];
      const index = list.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Producto no encontrado');

      list[index] = { ...list[index], ...updates };
      localStorage.setItem('spinkiu_products', JSON.stringify(list));
      return list[index];
    }
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      initializeLocalData();
      const prodJson = localStorage.getItem('spinkiu_products');
      let list: Product[] = prodJson ? JSON.parse(prodJson) : [];
      list = list.filter(p => p.id !== id);
      localStorage.setItem('spinkiu_products', JSON.stringify(list));
      return true;
    }
  },

  // --- CLIENTES ---
  async getClients(): Promise<Client[]> {
    const negocioId = await getActiveBusinessId();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('nombre', { ascending: true });

      if (error) throw error;
      return data || [];
    } else {
      initializeLocalData();
      const clientsJson = localStorage.getItem('spinkiu_clients');
      const clients: Client[] = clientsJson ? JSON.parse(clientsJson) : [];
      return clients.filter(c => c.negocio_id === negocioId).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  },

  async createClient(clientData: Omit<Client, 'id' | 'negocio_id' | 'created_at'>): Promise<Client> {
    const negocioId = await getActiveBusinessId();
    const newClient: Client = {
      id: isSupabaseConfigured ? undefined as any : 'client-' + Math.random().toString(36).substr(2, 9),
      negocio_id: negocioId,
      ...clientData,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .insert(newClient)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      initializeLocalData();
      const clientsJson = localStorage.getItem('spinkiu_clients');
      const clients = clientsJson ? JSON.parse(clientsJson) : [];
      clients.push(newClient);
      localStorage.setItem('spinkiu_clients', JSON.stringify(clients));
      return newClient;
    }
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      initializeLocalData();
      const clientsJson = localStorage.getItem('spinkiu_clients');
      let clients: Client[] = clientsJson ? JSON.parse(clientsJson) : [];
      const index = clients.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Cliente no encontrado');

      clients[index] = { ...clients[index], ...updates };
      localStorage.setItem('spinkiu_clients', JSON.stringify(clients));
      return clients[index];
    }
  },

  async deleteClient(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } else {
      initializeLocalData();
      const clientsJson = localStorage.getItem('spinkiu_clients');
      let clients: Client[] = clientsJson ? JSON.parse(clientsJson) : [];
      clients = clients.filter(c => c.id !== id);
      localStorage.setItem('spinkiu_clients', JSON.stringify(clients));

      const chargesJson = localStorage.getItem('spinkiu_charges');
      let charges: Charge[] = chargesJson ? JSON.parse(chargesJson) : [];
      charges = charges.filter(c => c.cliente_id !== id);
      localStorage.setItem('spinkiu_charges', JSON.stringify(charges));

      const invoicesJson = localStorage.getItem('spinkiu_invoices');
      let invoices: Invoice[] = invoicesJson ? JSON.parse(invoicesJson) : [];
      invoices = invoices.filter(i => i.cliente_id !== id);
      localStorage.setItem('spinkiu_invoices', JSON.stringify(invoices));

      return true;
    }
  },

  // --- CARGOS ACUMULATIVOS ---
  async getCharges(clienteId: string): Promise<Charge[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('charges')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: false });

      if (error) throw error;
      return data || [];
    } else {
      initializeLocalData();
      const chargesJson = localStorage.getItem('spinkiu_charges');
      const charges: Charge[] = chargesJson ? JSON.parse(chargesJson) : [];
      return charges
        .filter(c => c.cliente_id === clienteId)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }
  },

  async createCharge(chargeData: Omit<Charge, 'id' | 'negocio_id' | 'created_at' | 'invoice_id'>): Promise<Charge> {
    const negocioId = await getActiveBusinessId();
    const newCharge: Charge = {
      id: isSupabaseConfigured ? undefined as any : 'charge-' + Math.random().toString(36).substr(2, 9),
      negocio_id: negocioId,
      invoice_id: null,
      ...chargeData,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('charges')
        .insert(newCharge)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      initializeLocalData();
      const chargesJson = localStorage.getItem('spinkiu_charges');
      const charges = chargesJson ? JSON.parse(chargesJson) : [];
      charges.push(newCharge);
      localStorage.setItem('spinkiu_charges', JSON.stringify(charges));
      return newCharge;
    }
  },

  async deleteCharge(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('charges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } else {
      initializeLocalData();
      const chargesJson = localStorage.getItem('spinkiu_charges');
      let charges: Charge[] = chargesJson ? JSON.parse(chargesJson) : [];
      charges = charges.filter(c => c.id !== id);
      localStorage.setItem('spinkiu_charges', JSON.stringify(charges));
      return true;
    }
  },

  // --- FACTURAS E ÍTEMS ---
  async getInvoices(clienteId?: string): Promise<Invoice[]> {
    const negocioId = await getActiveBusinessId();

    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('negocio_id', negocioId);

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data: invoicesData, error } = await query.order('fecha_emision', { ascending: false });
      if (error) throw error;
      if (!invoicesData || invoicesData.length === 0) return [];

      // Enriquecer con items y cargos en SOLO 2 consultas (evita N+1)
      const invoiceIds = invoicesData.map(i => i.id);
      const { data: allItems } = await supabase.from('invoice_items').select('*').in('invoice_id', invoiceIds);
      const { data: allCharges } = await supabase.from('charges').select('*').in('invoice_id', invoiceIds);

      const itemsByInvoice: Record<string, InvoiceItem[]> = {};
      (allItems || []).forEach((it: any) => {
        if (!itemsByInvoice[it.invoice_id]) itemsByInvoice[it.invoice_id] = [];
        itemsByInvoice[it.invoice_id].push(it);
      });
      const chargesByInvoice: Record<string, Charge[]> = {};
      (allCharges || []).forEach((ch: any) => {
        if (!chargesByInvoice[ch.invoice_id]) chargesByInvoice[ch.invoice_id] = [];
        chargesByInvoice[ch.invoice_id].push(ch);
      });

      return invoicesData.map(inv => ({
        ...inv,
        items: itemsByInvoice[inv.id] || [],
        charges: chargesByInvoice[inv.id] || [],
      }));
    } else {
      initializeLocalData();
      const invoicesJson = localStorage.getItem('spinkiu_invoices');
      let list: Invoice[] = invoicesJson ? JSON.parse(invoicesJson) : [];
      
      list = list.filter(i => i.negocio_id === negocioId);
      if (clienteId) {
        list = list.filter(i => i.cliente_id === clienteId);
      }

      const itemsJson = localStorage.getItem('spinkiu_invoice_items');
      const itemsList: InvoiceItem[] = itemsJson ? JSON.parse(itemsJson) : [];

      const chargesJson = localStorage.getItem('spinkiu_charges');
      const chargesList: Charge[] = chargesJson ? JSON.parse(chargesJson) : [];

      return list.map(inv => ({
        ...inv,
        items: itemsList.filter(it => it.invoice_id === inv.id),
        charges: chargesList.filter(ch => ch.invoice_id === inv.id)
      })).sort((a, b) => new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime());
    }
  },

  async createInvoice(
    clienteId: string, 
    itemsData: Array<{ product_id: string | null; descripcion: string; fecha?: string | null; cantidad: number; precio_unitario: number; total: number }>,
    subtotal: number, 
    total: number, 
    estado: 'pendiente' | 'pagado',
    chargeIds?: string[],
    montoPagado?: number,
    deudaPendiente?: number
  ): Promise<Invoice> {
    const negocioId = await getActiveBusinessId();
    
    // Correlativo simple
    let prefix = 'FAC';
    let count = 1;
    if (typeof window !== 'undefined') {
      const storedCount = localStorage.getItem('spinkiu_invoice_count');
      count = storedCount ? parseInt(storedCount) + 1 : 1;
      localStorage.setItem('spinkiu_invoice_count', String(count));
    }
    const numeroFactura = `${prefix}-${String(count).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      id: isSupabaseConfigured ? undefined as any : 'invoice-' + Math.random().toString(36).substr(2, 9),
      cliente_id: clienteId,
      negocio_id: negocioId,
      numero_factura: numeroFactura,
      fecha_emision: new Date().toISOString(),
      subtotal,
      total,
      monto_pagado: montoPagado || 0,
      deuda_pendiente: deudaPendiente || 0,
      estado,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      // 1. Crear factura
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(newInvoice)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // 2. Crear items
      if (itemsData.length > 0) {
        const items = itemsData.map(it => ({
          ...it,
          invoice_id: invoiceData.id,
        }));
        const { error: itemsError } = await supabase.from('invoice_items').insert(items);
        if (itemsError) throw itemsError;
      }

      // 3. Vincular cargos de cuenta corriente si existen
      if (chargeIds && chargeIds.length > 0) {
        const { error: chargesError } = await supabase
          .from('charges')
          .update({ invoice_id: invoiceData.id })
          .in('id', chargeIds);
        if (chargesError) throw chargesError;
      }

      // 4. Descontar Stock
      for (const it of itemsData) {
        if (it.product_id && it.cantidad > 0) {
          // Leer stock actual
          const { data: prod } = await supabase.from('products').select('stock').eq('id', it.product_id).single();
          if (prod && prod.stock !== null) {
            const newStock = Math.max(0, prod.stock - it.cantidad);
            await supabase.from('products').update({ stock: newStock }).eq('id', it.product_id);
          }
        }
      }

      // Devolver factura enriquecida
      const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceData.id);
      return {
        ...invoiceData,
        items: items || [],
      };
    } else {
      initializeLocalData();
      // 1. Guardar factura
      const invoicesJson = localStorage.getItem('spinkiu_invoices');
      const invoices = invoicesJson ? JSON.parse(invoicesJson) : [];
      invoices.push(newInvoice);
      localStorage.setItem('spinkiu_invoices', JSON.stringify(invoices));

      // 2. Guardar items
      const createdItems: InvoiceItem[] = itemsData.map(it => ({
        id: 'item-' + Math.random().toString(36).substr(2, 9),
        invoice_id: newInvoice.id,
        product_id: it.product_id,
        descripcion: it.descripcion,
        fecha: it.fecha || null,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        total: it.total,
        created_at: new Date().toISOString(),
      }));

      const itemsJson = localStorage.getItem('spinkiu_invoice_items');
      const itemsList = itemsJson ? JSON.parse(itemsJson) : [];
      itemsList.push(...createdItems);
      localStorage.setItem('spinkiu_invoice_items', JSON.stringify(itemsList));

      // 3. Descontar Stock
      const prodJson = localStorage.getItem('spinkiu_products');
      let productsList: Product[] = prodJson ? JSON.parse(prodJson) : [];
      
      itemsData.forEach(it => {
        if (it.product_id) {
          const idx = productsList.findIndex(p => p.id === it.product_id);
          if (idx !== -1 && productsList[idx].stock !== null) {
            productsList[idx].stock = Math.max(0, (productsList[idx].stock || 0) - it.cantidad);
          }
        }
      });
      localStorage.setItem('spinkiu_products', JSON.stringify(productsList));

      // 4. Vincular cargos de cuenta corriente si se proveen
      if (chargeIds && chargeIds.length > 0) {
        const chargesJson = localStorage.getItem('spinkiu_charges');
        const chargesList: Charge[] = chargesJson ? JSON.parse(chargesJson) : [];
        const updated = chargesList.map(ch => {
          if (chargeIds.includes(ch.id)) {
            return { ...ch, invoice_id: newInvoice.id };
          }
          return ch;
        });
        localStorage.setItem('spinkiu_charges', JSON.stringify(updated));
      }

      newInvoice.items = createdItems;
      return newInvoice;
    }
  },

  async deleteInvoice(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      // 1. Devolver stock (opcional, pero profesional)
      const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', id);
      if (items) {
        for (const it of items) {
          if (it.product_id && it.cantidad > 0) {
            const { data: prod } = await supabase.from('products').select('stock').eq('id', it.product_id).single();
            if (prod && prod.stock !== null) {
              await supabase.from('products').update({ stock: prod.stock + it.cantidad }).eq('id', it.product_id);
            }
          }
        }
      }

      // Desvincular cargos
      await supabase.from('charges').update({ invoice_id: null }).eq('invoice_id', id);
      
      // Eliminar factura
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      initializeLocalData();
      
      // 1. Devolver stock
      const itemsJson = localStorage.getItem('spinkiu_invoice_items');
      const itemsList: InvoiceItem[] = itemsJson ? JSON.parse(itemsJson) : [];
      const targetItems = itemsList.filter(it => it.invoice_id === id);

      const prodJson = localStorage.getItem('spinkiu_products');
      let productsList: Product[] = prodJson ? JSON.parse(prodJson) : [];

      targetItems.forEach(it => {
        if (it.product_id) {
          const idx = productsList.findIndex(p => p.id === it.product_id);
          if (idx !== -1 && productsList[idx].stock !== null) {
            productsList[idx].stock = (productsList[idx].stock || 0) + it.cantidad;
          }
        }
      });
      localStorage.setItem('spinkiu_products', JSON.stringify(productsList));

      // 2. Desvincular cargos
      const chargesJson = localStorage.getItem('spinkiu_charges');
      const chargesList: Charge[] = chargesJson ? JSON.parse(chargesJson) : [];
      const updatedCharges = chargesList.map(ch => {
        if (ch.invoice_id === id) return { ...ch, invoice_id: null };
        return ch;
      });
      localStorage.setItem('spinkiu_charges', JSON.stringify(updatedCharges));

      // 3. Eliminar factura y sus items de localStorage
      const invoicesJson = localStorage.getItem('spinkiu_invoices');
      let invoicesList: Invoice[] = invoicesJson ? JSON.parse(invoicesJson) : [];
      invoicesList = invoicesList.filter(i => i.id !== id);
      localStorage.setItem('spinkiu_invoices', JSON.stringify(invoicesList));

      let nextItems = itemsList.filter(it => it.invoice_id !== id);
      localStorage.setItem('spinkiu_invoice_items', JSON.stringify(nextItems));

      return true;
    }
  },

  async updateInvoiceStatus(id: string, estado: 'pendiente' | 'pagado'): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('invoices')
        .update({ estado })
        .eq('id', id);

      if (error) throw error;
      return true;
    } else {
      initializeLocalData();
      const invoicesJson = localStorage.getItem('spinkiu_invoices');
      let invoices: Invoice[] = invoicesJson ? JSON.parse(invoicesJson) : [];
      const index = invoices.findIndex(i => i.id === id);
      if (index === -1) throw new Error('Factura no encontrada');

      invoices[index].estado = estado;
      localStorage.setItem('spinkiu_invoices', JSON.stringify(invoices));
      return true;
    }
  },

  // --- EVIDENCIAS (FOTOGRAFÍAS CON FECHA) ---
  async getEvidence(): Promise<Evidence[]> {
    const negocioId = await getActiveBusinessId();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('evidence')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('fecha', { ascending: false });

      if (error) throw error;
      const rows = data || [];

      // Firmar las rutas de Storage (bucket privado) para poder mostrarlas
      const paths = new Set<string>();
      for (const r of rows) {
        const ps: string[] = (r.fotos && r.fotos.length) ? r.fotos : (r.foto_url ? [r.foto_url] : []);
        ps.forEach((p: string) => { if (p && !isRemoteOrData(p)) paths.add(p); });
      }

      const urlMap: Record<string, string> = {};
      if (paths.size > 0) {
        const { data: signed } = await supabase.storage
          .from(EVIDENCE_BUCKET)
          .createSignedUrls(Array.from(paths), 60 * 60 * 8); // 8 horas
        (signed || []).forEach((s: any) => { if (s?.path && s?.signedUrl) urlMap[s.path] = s.signedUrl; });
      }

      const resolve = (p: string) => (isRemoteOrData(p) ? p : (urlMap[p] || ''));
      return rows.map((r: any) => {
        const ps: string[] = (r.fotos && r.fotos.length) ? r.fotos : (r.foto_url ? [r.foto_url] : []);
        const resolved = ps.map(resolve).filter(Boolean);
        return { ...r, foto_url: resolved[0] || '', fotos: resolved };
      });
    } else {
      const json = localStorage.getItem('spinkiu_evidence');
      const list: Evidence[] = json ? JSON.parse(json) : [];
      return list
        .filter(e => e.negocio_id === negocioId)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }
  },

  async createEvidence(data: { cliente_id: string | null; descripcion: string; fotos: string[]; fecha: string }): Promise<Evidence> {
    const negocioId = await getActiveBusinessId();
    const fotos = data.fotos && data.fotos.length ? data.fotos : [];

    if (isSupabaseConfigured && supabase) {
      // 1. Subir cada foto al bucket privado -> guardamos solo la RUTA
      const uploadedPaths: string[] = [];
      for (const foto of fotos) {
        if (foto.startsWith('http')) { uploadedPaths.push(foto); continue; } // ya era una URL
        const blob = dataUrlToBlob(foto);
        const path = `${negocioId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(EVIDENCE_BUCKET)
          .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
        if (upErr) throw upErr;
        uploadedPaths.push(path);
      }

      // 2. Insertar la fila con las rutas (NO Base64) -> tabla ligera
      const row = {
        negocio_id: negocioId,
        cliente_id: data.cliente_id,
        descripcion: data.descripcion,
        foto_url: uploadedPaths[0] || '',
        fotos: uploadedPaths,
        fecha: data.fecha,
        created_at: new Date().toISOString(),
      };
      const { data: inserted, error } = await supabase.from('evidence').insert(row).select().single();
      if (error) throw error;

      // 3. Devolver con las imágenes originales para mostrarlas de inmediato
      return { ...inserted, foto_url: fotos[0] || '', fotos };
    } else {
      const newEvidence: Evidence = {
        id: 'ev-' + Math.random().toString(36).substring(2, 11),
        negocio_id: negocioId,
        cliente_id: data.cliente_id,
        descripcion: data.descripcion,
        foto_url: fotos[0] || '',
        fotos,
        fecha: data.fecha,
        created_at: new Date().toISOString(),
      };
      const json = localStorage.getItem('spinkiu_evidence');
      const list = json ? JSON.parse(json) : [];
      list.push(newEvidence);
      localStorage.setItem('spinkiu_evidence', JSON.stringify(list));
      return newEvidence;
    }
  },

  async deleteEvidence(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      // Eliminar también los archivos del bucket para no dejar huérfanos
      const { data: row } = await supabase.from('evidence').select('foto_url, fotos').eq('id', id).single();
      if (row) {
        const ps: string[] = (row.fotos && row.fotos.length) ? row.fotos : (row.foto_url ? [row.foto_url] : []);
        const storagePaths = ps.filter((p: string) => p && !isRemoteOrData(p));
        if (storagePaths.length) {
          await supabase.storage.from(EVIDENCE_BUCKET).remove(storagePaths);
        }
      }
      const { error } = await supabase.from('evidence').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const json = localStorage.getItem('spinkiu_evidence');
      let list: Evidence[] = json ? JSON.parse(json) : [];
      list = list.filter(e => e.id !== id);
      localStorage.setItem('spinkiu_evidence', JSON.stringify(list));
      return true;
    }
  }
};
