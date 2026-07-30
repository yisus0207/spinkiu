import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verifica si las credenciales de Supabase están configuradas.
 */
export const isAdminConfigured = !!(supabaseUrl && serviceRoleKey);

if (!isAdminConfigured) {
  console.warn(
    '[Spinkiu API] ADVERTENCIA: Variables de entorno de Supabase no configuradas.',
    'Los endpoints de la API no funcionarán hasta que se configuren',
    'NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local'
  );
}

let clientInstance: SupabaseClient | null = null;

if (isAdminConfigured) {
  clientInstance = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Cliente Supabase con privilegios administrativos (Service Role Key).
 * SOLO para uso en el servidor (API Routes).
 * Bypasea RLS — toda la seguridad se maneja vía API Key + negocio_id.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    if (!clientInstance) {
      throw new Error('Supabase Admin no configurado en el servidor.');
    }
    // Bind methods to the original clientInstance to prevent context binding issues
    const value = Reflect.get(clientInstance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(clientInstance);
    }
    return value;
  }
});

