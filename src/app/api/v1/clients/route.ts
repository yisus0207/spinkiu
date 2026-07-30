import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiCreated, apiError, apiServerError } from '@/lib/apiResponse';

/**
 * GET /api/v1/clients
 * Lista todos los proveedores/clientes del negocio autenticado.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('negocio_id', auth.negocioId)
      .order('nombre', { ascending: true });

    if (error) throw error;

    return apiSuccess(data || [], { count: data?.length || 0 });
  } catch (err) {
    return apiServerError(err);
  }
}

/**
 * POST /api/v1/clients
 * Crea un nuevo proveedor/cliente.
 * 
 * Body: { nombre: string, telefono?: string, direccion?: string, observaciones?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();

    if (!body.nombre || !body.nombre.trim()) {
      return apiError('El campo "nombre" es obligatorio.');
    }

    const newClient = {
      negocio_id: auth.negocioId,
      nombre: body.nombre.trim(),
      telefono: body.telefono?.trim() || '',
      direccion: body.direccion?.trim() || '',
      observaciones: body.observaciones?.trim() || '',
    };

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert(newClient)
      .select()
      .single();

    if (error) throw error;

    return apiCreated(data);
  } catch (err) {
    return apiServerError(err);
  }
}
