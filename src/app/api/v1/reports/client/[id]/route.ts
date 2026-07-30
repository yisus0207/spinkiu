import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/apiResponse';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/reports/client/:id
 * Genera un reporte completo de la cuenta corriente de un proveedor.
 * 
 * Incluye:
 *   - Datos del proveedor
 *   - Saldo pendiente actual (desglosado)
 *   - Movimientos pendientes de facturar
 *   - Historial de facturas emitidas
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    // Obtener datos del proveedor
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!client) return apiNotFound('Proveedor');

    // Obtener TODOS los cargos
    const { data: allCharges } = await supabaseAdmin
      .from('charges')
      .select('*')
      .eq('cliente_id', id)
      .eq('negocio_id', auth.negocioId)
      .order('fecha', { ascending: false });

    const charges = allCharges || [];
    const pendingCharges = charges.filter(c => c.invoice_id === null);
    const invoicedCharges = charges.filter(c => c.invoice_id !== null);

    // Calcular saldo
    const saldo = pendingCharges.reduce((sum, c) => sum + Number(c.monto), 0);
    const totalEntregas = pendingCharges.filter(c => Number(c.monto) > 0).reduce((sum, c) => sum + Number(c.monto), 0);
    const totalAdelantos = pendingCharges.filter(c => Number(c.monto) < 0).reduce((sum, c) => sum + Math.abs(Number(c.monto)), 0);

    // Obtener facturas del proveedor
    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('cliente_id', id)
      .eq('negocio_id', auth.negocioId)
      .order('fecha_emision', { ascending: false });

    return apiSuccess({
      proveedor: client,
      saldo: {
        neto: saldo,
        total_entregas: totalEntregas,
        total_adelantos: totalAdelantos,
        movimientos_pendientes: pendingCharges.length,
      },
      movimientos_pendientes: pendingCharges,
      facturas: (invoices || []).map(inv => ({
        ...inv,
        cargos_vinculados: invoicedCharges.filter(c => c.invoice_id === inv.id).length,
      })),
      resumen: {
        total_movimientos_historicos: charges.length,
        total_facturas_emitidas: invoices?.length || 0,
        facturas_pendientes: invoices?.filter(i => i.estado === 'pendiente').length || 0,
        facturas_pagadas: invoices?.filter(i => i.estado === 'pagado').length || 0,
      },
    });
  } catch (err) {
    return apiServerError(err);
  }
}
