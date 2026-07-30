import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiNotFound, apiError, apiServerError } from '@/lib/apiResponse';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/v1/charges/:id
 * Elimina un cargo/movimiento individual.
 * Solo permite eliminar cargos que NO estén vinculados a una factura.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    // Verificar que el cargo existe y pertenece al negocio
    const { data: existing } = await supabaseAdmin
      .from('charges')
      .select('id, invoice_id, negocio_id')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!existing) return apiNotFound('Movimiento');

    if (existing.invoice_id) {
      return apiError(
        'No se puede eliminar un movimiento que ya fue facturado. Elimina la factura primero.',
        409
      );
    }

    const { error } = await supabaseAdmin
      .from('charges')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return apiSuccess({ deleted: true, id });
  } catch (err) {
    return apiServerError(err);
  }
}
