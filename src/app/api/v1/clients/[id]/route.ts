import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiError, apiNotFound, apiServerError } from '@/lib/apiResponse';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/clients/:id
 * Obtiene un proveedor por su ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (error || !data) return apiNotFound('Proveedor');

    return apiSuccess(data);
  } catch (err) {
    return apiServerError(err);
  }
}

/**
 * PATCH /api/v1/clients/:id
 * Actualiza datos de un proveedor.
 * 
 * Body: { nombre?: string, telefono?: string, direccion?: string, observaciones?: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();

    // Solo permitir campos válidos
    const allowedFields = ['nombre', 'telefono', 'direccion', 'observaciones'];
    const updates: Record<string, string> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiError('No se proporcionaron campos para actualizar.');
    }

    if (updates.nombre !== undefined && !updates.nombre) {
      return apiError('El campo "nombre" no puede estar vacío.');
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .select()
      .single();

    if (error || !data) return apiNotFound('Proveedor');

    return apiSuccess(data);
  } catch (err) {
    return apiServerError(err);
  }
}

/**
 * DELETE /api/v1/clients/:id
 * Elimina un proveedor y todo su historial (cascada en BD).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    // Verificar que el proveedor existe y pertenece al negocio
    const { data: existing } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!existing) return apiNotFound('Proveedor');

    const { error } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return apiSuccess({ deleted: true, id });
  } catch (err) {
    return apiServerError(err);
  }
}
