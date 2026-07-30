import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiCreated, apiError, apiServerError } from '@/lib/apiResponse';

/**
 * POST /api/v1/invoices/generate
 * Liquida la cuenta corriente de un proveedor generando una factura
 * a partir de todos sus cargos pendientes.
 * 
 * Body: {
 *   cliente_id: string,
 *   monto_pagado?: number,    // Cuánto se le paga al proveedor ahora. Default: total
 *   estado?: "pendiente" | "pagado"  // Default: se auto-calcula
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();

    if (!body.cliente_id) {
      return apiError('El campo "cliente_id" es obligatorio.');
    }

    // Verificar que el proveedor pertenece al negocio
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, nombre')
      .eq('id', body.cliente_id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!client) {
      return apiError('Proveedor no encontrado o no pertenece a tu negocio.', 404);
    }

    // Obtener cargos pendientes
    const { data: pendingCharges, error: chargesError } = await supabaseAdmin
      .from('charges')
      .select('*')
      .eq('cliente_id', body.cliente_id)
      .eq('negocio_id', auth.negocioId)
      .is('invoice_id', null)
      .order('fecha', { ascending: true });

    if (chargesError) throw chargesError;

    if (!pendingCharges || pendingCharges.length === 0) {
      return apiError('No hay movimientos pendientes de facturar para este proveedor.');
    }

    // Calcular totales
    const subtotal = pendingCharges.reduce((sum, c) => sum + Number(c.monto), 0);
    const total = subtotal;
    const montoPagado = body.monto_pagado !== undefined ? parseFloat(body.monto_pagado) : Math.abs(total);
    const deudaPendiente = Math.max(0, Math.abs(total) - montoPagado);
    const estado = body.estado || (deudaPendiente === 0 ? 'pagado' : 'pendiente');

    // Generar número de factura correlativo
    const { count } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('negocio_id', auth.negocioId);

    const nextNum = (count || 0) + 1;
    const numeroFactura = `FAC-${String(nextNum).padStart(4, '0')}`;

    // 1. Crear factura
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        cliente_id: body.cliente_id,
        negocio_id: auth.negocioId,
        numero_factura: numeroFactura,
        fecha_emision: new Date().toISOString(),
        subtotal,
        total,
        monto_pagado: montoPagado,
        deuda_pendiente: deudaPendiente,
        estado,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // 2. Crear items de factura a partir de los cargos
    const items = pendingCharges.map(c => {
      const fechaStr = new Date(c.fecha).toLocaleDateString('es-CO');
      const baseDesc = c.solicitado_por
        ? `${c.descripcion} (Solicitado por: ${c.solicitado_por})`
        : c.descripcion;
      return {
        invoice_id: invoice.id,
        product_id: null,
        descripcion: `[${fechaStr}] ${baseDesc}`,
        cantidad: c.cantidad !== null && c.cantidad !== undefined ? Number(c.cantidad) : 1,
        precio_unitario: c.precio_unitario !== null && c.precio_unitario !== undefined
          ? Number(c.precio_unitario)
          : Number(c.monto),
        total: Number(c.monto),
      };
    });

    const { error: itemsError } = await supabaseAdmin
      .from('invoice_items')
      .insert(items);

    if (itemsError) throw itemsError;

    // 3. Vincular los cargos a esta factura
    const chargeIds = pendingCharges.map(c => c.id);
    const { error: linkError } = await supabaseAdmin
      .from('charges')
      .update({ invoice_id: invoice.id })
      .in('id', chargeIds);

    if (linkError) throw linkError;

    // 4. Si queda deuda, crear un cargo de arrastre al siguiente periodo
    if (deudaPendiente > 0) {
      const signedDebt = total < 0 ? -deudaPendiente : deudaPendiente;
      await supabaseAdmin
        .from('charges')
        .insert({
          cliente_id: body.cliente_id,
          negocio_id: auth.negocioId,
          descripcion: `Saldo restante de factura anterior [${numeroFactura}]`,
          monto: signedDebt,
          tipo_movimiento: signedDebt > 0 ? 'entrada' : 'salida',
          fecha: new Date().toISOString(),
          invoice_id: null,
        });
    }

    return apiCreated({
      invoice: {
        ...invoice,
        nombre_proveedor: client.nombre,
        items,
      },
      resumen: {
        total_movimientos: pendingCharges.length,
        subtotal,
        total,
        monto_pagado: montoPagado,
        deuda_pendiente: deudaPendiente,
        estado,
      },
    });
  } catch (err) {
    return apiServerError(err);
  }
}
