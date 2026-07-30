import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiError, apiNotFound, apiServerError } from '@/lib/apiResponse';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/products/:id
 * Obtiene un producto por su ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (error || !data) return apiNotFound('Producto');

    return apiSuccess(data);
  } catch (err) {
    return apiServerError(err);
  }
}

/**
 * PATCH /api/v1/products/:id
 * Actualiza un producto (nombre, precio, stock, código).
 * 
 * Body: { nombre?: string, precio?: number, stock?: number | null, codigo?: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};

    if (body.nombre !== undefined) {
      if (!body.nombre.trim()) return apiError('El nombre no puede estar vacío.');
      updates.nombre = body.nombre.trim();
    }
    if (body.precio !== undefined) {
      const precio = parseFloat(body.precio);
      if (isNaN(precio) || precio < 0) return apiError('El precio debe ser >= 0.');
      updates.precio = precio;
    }
    if (body.stock !== undefined) {
      updates.stock = body.stock; // null permitido (ilimitado)
    }
    if (body.codigo !== undefined) {
      updates.codigo = body.codigo.trim();
    }

    if (Object.keys(updates).length === 0) {
      return apiError('No se proporcionaron campos para actualizar.');
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .select()
      .single();

    if (error || !data) return apiNotFound('Producto');

    return apiSuccess(data);
  } catch (err) {
    return apiServerError(err);
  }
}

/**
 * DELETE /api/v1/products/:id
 * Elimina un producto del catálogo.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!existing) return apiNotFound('Producto');

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return apiSuccess({ deleted: true, id });
  } catch (err) {
    return apiServerError(err);
  }
}
