import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiCreated, apiError, apiServerError } from '@/lib/apiResponse';

/**
 * GET /api/v1/charges?client_id=xxx&status=pending|all
 * Lista cargos/movimientos de un proveedor.
 * 
 * Query params:
 *   - client_id (requerido): ID del proveedor
 *   - status: "pending" (sin facturar) | "all" (todos). Default: "all"
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const clientId = request.nextUrl.searchParams.get('client_id');
    const status = request.nextUrl.searchParams.get('status') || 'all';

    if (!clientId) {
      return apiError('El parámetro "client_id" es requerido.');
    }

    // Verificar que el cliente pertenece al negocio
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!client) {
      return apiError('Proveedor no encontrado o no pertenece a tu negocio.', 404);
    }

    let query = supabaseAdmin
      .from('charges')
      .select('*')
      .eq('cliente_id', clientId)
      .eq('negocio_id', auth.negocioId)
      .order('fecha', { ascending: false });

    if (status === 'pending') {
      query = query.is('invoice_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess(data || [], { count: data?.length || 0 });
  } catch (err) {
    return apiServerError(err);
  }
}

/**
 * POST /api/v1/charges
 * Registra un nuevo movimiento (entrega de producto o adelanto de dinero).
 * 
 * Body: {
 *   cliente_id: string,
 *   tipo_movimiento: "entrada" | "salida",
 *   tipo_unidad?: "litro" | "libra" | "unidad" | "muestra",
 *   cantidad?: number,
 *   precio_unitario?: number,
 *   monto?: number,              // Requerido si tipo_movimiento es "salida"
 *   descripcion?: string,        // Si no se envía, se auto-genera
 *   solicitado_por?: string,
 *   fecha?: string               // ISO 8601. Default: ahora
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

    if (!body.tipo_movimiento || !['entrada', 'salida'].includes(body.tipo_movimiento)) {
      return apiError('El campo "tipo_movimiento" debe ser "entrada" o "salida".');
    }

    // Verificar que el cliente pertenece al negocio
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, nombre')
      .eq('id', body.cliente_id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!client) {
      return apiError('Proveedor no encontrado o no pertenece a tu negocio.', 404);
    }

    let descripcion = '';
    let monto = 0;

    if (body.tipo_movimiento === 'entrada') {
      // Entrega de producto
      const validUnits = ['litro', 'libra', 'unidad', 'muestra'];
      if (!body.tipo_unidad || !validUnits.includes(body.tipo_unidad)) {
        return apiError(`El campo "tipo_unidad" debe ser uno de: ${validUnits.join(', ')}`);
      }

      const cantidad = parseFloat(body.cantidad);
      if (isNaN(cantidad) || cantidad <= 0) {
        return apiError('El campo "cantidad" debe ser un número mayor a 0.');
      }

      // Si no viene precio_unitario, buscarlo en el perfil del negocio
      let precioUnitario = parseFloat(body.precio_unitario);
      if (isNaN(precioUnitario) || precioUnitario <= 0) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('precio_litro, precio_libra, precio_unidad')
          .eq('id', auth.negocioId)
          .single();

        if (profile) {
          const priceMap: Record<string, number> = {
            litro: Number(profile.precio_litro || 0),
            libra: Number(profile.precio_libra || 0),
            unidad: Number(profile.precio_unidad || 0),
            muestra: 0,
          };
          precioUnitario = priceMap[body.tipo_unidad] || 0;
        } else {
          precioUnitario = 0;
        }
      }

      monto = cantidad * precioUnitario; // Positivo: el negocio le debe al proveedor
      descripcion = body.descripcion?.trim() ||
        `Entrega: ${cantidad} ${body.tipo_unidad.charAt(0).toUpperCase() + body.tipo_unidad.slice(1)}${cantidad !== 1 ? 's' : ''}`;
    } else {
      // Salida / adelanto de dinero
      const montoVal = parseFloat(body.monto);
      if (isNaN(montoVal) || montoVal <= 0) {
        return apiError('El campo "monto" debe ser un número positivo para adelantos/salidas.');
      }
      monto = -montoVal; // Negativo: resta del saldo del proveedor
      descripcion = body.descripcion?.trim() || 'Adelanto de efectivo';
    }

    const newCharge = {
      cliente_id: body.cliente_id,
      negocio_id: auth.negocioId,
      descripcion,
      monto,
      tipo_movimiento: body.tipo_movimiento,
      tipo_unidad: body.tipo_movimiento === 'entrada' ? body.tipo_unidad : null,
      cantidad: body.tipo_movimiento === 'entrada' ? parseFloat(body.cantidad) : null,
      precio_unitario: body.tipo_movimiento === 'entrada' ? (parseFloat(body.precio_unitario) || monto / parseFloat(body.cantidad)) : null,
      solicitado_por: body.solicitado_por?.trim() || null,
      fecha: body.fecha ? new Date(body.fecha).toISOString() : new Date().toISOString(),
      invoice_id: null,
    };

    const { data, error } = await supabaseAdmin
      .from('charges')
      .insert(newCharge)
      .select()
      .single();

    if (error) throw error;

    // Calcular saldo actualizado del proveedor
    const { data: allPending } = await supabaseAdmin
      .from('charges')
      .select('monto')
      .eq('cliente_id', body.cliente_id)
      .eq('negocio_id', auth.negocioId)
      .is('invoice_id', null);

    const saldoActual = (allPending || []).reduce((sum: number, c: { monto: number }) => sum + Number(c.monto), 0);

    return apiCreated({
      charge: data,
      provider: client.nombre,
      saldo_actual: saldoActual,
    });
  } catch (err) {
    return apiServerError(err);
  }
}
