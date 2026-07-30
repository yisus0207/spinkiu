import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiServerError } from '@/lib/apiResponse';

/**
 * GET /api/v1/reports/dashboard
 * Obtiene las métricas clave del negocio (KPIs del dashboard).
 * 
 * Respuesta:
 *   - total_proveedores
 *   - total_facturas
 *   - facturas_pendientes
 *   - monto_pendiente_total
 *   - ultimas_facturas (las 5 más recientes)
 *   - ultimos_proveedores (los 5 más recientes)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const negocioId = auth.negocioId;

    // Contar proveedores
    const { count: totalProviders } = await supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocioId);

    // Contar facturas y pendientes
    const { data: allInvoices } = await supabaseAdmin
      .from('invoices')
      .select('id, total, estado, fecha_emision, numero_factura, cliente_id')
      .eq('negocio_id', negocioId)
      .order('fecha_emision', { ascending: false });

    const invoices = allInvoices || [];
    const pendingInvoices = invoices.filter(i => i.estado === 'pendiente');
    const totalUnpaid = pendingInvoices.reduce((sum, i) => sum + Number(i.total), 0);

    // Últimas 5 facturas con nombre de proveedor
    const recentInvoices = [];
    for (const inv of invoices.slice(0, 5)) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('nombre')
        .eq('id', inv.cliente_id)
        .single();

      recentInvoices.push({
        ...inv,
        nombre_proveedor: client?.nombre || 'Desconocido',
      });
    }

    // Últimos 5 proveedores
    const { data: recentProviders } = await supabaseAdmin
      .from('clients')
      .select('id, nombre, telefono, created_at')
      .eq('negocio_id', negocioId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Contar productos
    const { count: totalProducts } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocioId);

    return apiSuccess({
      total_proveedores: totalProviders || 0,
      total_facturas: invoices.length,
      facturas_pendientes: pendingInvoices.length,
      monto_pendiente_total: totalUnpaid,
      total_productos: totalProducts || 0,
      ultimas_facturas: recentInvoices,
      ultimos_proveedores: recentProviders || [],
    });
  } catch (err) {
    return apiServerError(err);
  }
}
