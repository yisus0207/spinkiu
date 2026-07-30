import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/apiResponse';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/invoices/:id
 * Obtiene una factura completa con sus ítems y datos del proveedor.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!invoice) return apiNotFound('Factura');

    // Obtener items
    const { data: items } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    // Obtener cargos vinculados
    const { data: charges } = await supabaseAdmin
      .from('charges')
      .select('*')
      .eq('invoice_id', id);

    // Obtener nombre del proveedor
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('nombre, telefono, direccion')
      .eq('id', invoice.cliente_id)
      .single();

    return apiSuccess({
      ...invoice,
      nombre_proveedor: client?.nombre || 'Desconocido',
      proveedor: client || null,
      items: items || [],
      charges: charges || [],
    });
  } catch (err) {
    return apiServerError(err);
  }
}

/**
 * DELETE /api/v1/invoices/:id
 * Elimina una factura, revierte el stock y desvincula sus cargos.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    // Verificar que la factura existe y pertenece al negocio
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('id, negocio_id')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!invoice) return apiNotFound('Factura');

    // 1. Revertir stock de productos si aplica
    const { data: items } = await supabaseAdmin
      .from('invoice_items')
      .select('product_id, cantidad')
      .eq('invoice_id', id);

    if (items) {
      for (const item of items) {
        if (item.product_id && item.cantidad > 0) {
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();

          if (product && product.stock !== null) {
            await supabaseAdmin
              .from('products')
              .update({ stock: product.stock + item.cantidad })
              .eq('id', item.product_id);
          }
        }
      }
    }

    // 2. Desvincular cargos (poner invoice_id = null)
    await supabaseAdmin
      .from('charges')
      .update({ invoice_id: null })
      .eq('invoice_id', id);

    // 3. Eliminar factura (los items se borran por CASCADE)
    const { error } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return apiSuccess({ deleted: true, id });
  } catch (err) {
    return apiServerError(err);
  }
}
