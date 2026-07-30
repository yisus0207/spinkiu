import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiError, apiServerError } from '@/lib/apiResponse';

/**
 * GET /api/v1/profile
 * Obtiene los datos del perfil/negocio asociado a la API Key.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', auth.negocioId)
      .single();

    if (error || !data) {
      return apiError('Perfil del negocio no encontrado.', 404);
    }

    return apiSuccess(data);
  } catch (err) {
    return apiServerError(err);
  }
}

/**
 * PATCH /api/v1/profile
 * Actualiza datos del perfil del negocio.
 * 
 * Body: {
 *   nombre_negocio?: string,
 *   nombre_propietario?: string,
 *   direccion?: string,
 *   telefono?: string,
 *   nit?: string,
 *   precio_litro?: number,
 *   precio_libra?: number,
 *   precio_unidad?: number
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();

    const allowedFields = [
      'nombre_negocio', 'nombre_propietario', 'direccion',
      'telefono', 'nit', 'precio_litro', 'precio_libra', 'precio_unidad'
    ];

    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiError('No se proporcionaron campos para actualizar.');
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', auth.negocioId)
      .select()
      .single();

    if (error) throw error;

    return apiSuccess(data);
  } catch (err) {
    return apiServerError(err);
  }
}
