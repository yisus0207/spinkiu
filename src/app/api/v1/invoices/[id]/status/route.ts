import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiError, apiNotFound, apiServerError } from '@/lib/apiResponse';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/invoices/:id/status
 * Cambia el estado de una factura entre "pendiente" y "pagado".
 * 
 * Body: { estado: "pendiente" | "pagado" }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();

    if (!body.estado || !['pendiente', 'pagado'].includes(body.estado)) {
      return apiError('El campo "estado" debe ser "pendiente" o "pagado".');
    }

    // Verificar que la factura existe y pertenece al negocio
    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('id, estado, numero_factura')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!existing) return apiNotFound('Factura');

    const updateData: Record<string, unknown> = { estado: body.estado };

    // Si se marca como pagado, limpiar la deuda pendiente
    if (body.estado === 'pagado') {
      updateData.deuda_pendiente = 0;
    }

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return apiSuccess({
      ...data,
      mensaje: `Factura ${existing.numero_factura} actualizada a "${body.estado}".`,
    });
  } catch (err) {
    return apiServerError(err);
  }
}
