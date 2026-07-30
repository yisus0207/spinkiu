import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiServerError } from '@/lib/apiResponse';

/**
 * GET /api/v1/invoices?client_id=xxx
 * Lista facturas/liquidaciones del negocio.
 * Si se pasa client_id, filtra por proveedor.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const clientId = request.nextUrl.searchParams.get('client_id');

    let query = supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('negocio_id', auth.negocioId)
      .order('fecha_emision', { ascending: false });

    if (clientId) {
      query = query.eq('cliente_id', clientId);
    }

    const { data: invoices, error } = await query;
    if (error) throw error;

    // Enriquecer con items y nombre del proveedor
    const enriched = [];
    for (const inv of (invoices || [])) {
      const { data: items } = await supabaseAdmin
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', inv.id);

      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('nombre')
        .eq('id', inv.cliente_id)
        .single();

      enriched.push({
        ...inv,
        nombre_proveedor: client?.nombre || 'Desconocido',
        items: items || [],
      });
    }

    return apiSuccess(enriched, { count: enriched.length });
  } catch (err) {
    return apiServerError(err);
  }
}
