import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiError, apiServerError } from '@/lib/apiResponse';

/**
 * GET /api/v1/charges/balance?client_id=xxx
 * Obtiene el saldo actual (cargos pendientes) de un proveedor.
 * 
 * Respuesta incluye:
 *   - saldo: número con signo (positivo = negocio le debe al proveedor)
 *   - total_entregas: suma de todos los montos positivos pendientes
 *   - total_adelantos: suma de todos los montos negativos pendientes
 *   - movimientos_pendientes: cantidad de movimientos sin facturar
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const clientId = request.nextUrl.searchParams.get('client_id');

    if (!clientId) {
      return apiError('El parámetro "client_id" es requerido.');
    }

    // Verificar que el cliente pertenece al negocio
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, nombre')
      .eq('id', clientId)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!client) {
      return apiError('Proveedor no encontrado o no pertenece a tu negocio.', 404);
    }

    // Obtener cargos pendientes (sin facturar)
    const { data: pending, error } = await supabaseAdmin
      .from('charges')
      .select('monto')
      .eq('cliente_id', clientId)
      .eq('negocio_id', auth.negocioId)
      .is('invoice_id', null);

    if (error) throw error;

    const charges = pending || [];
    const saldo = charges.reduce((sum, c) => sum + Number(c.monto), 0);
    const totalEntregas = charges.filter(c => Number(c.monto) > 0).reduce((sum, c) => sum + Number(c.monto), 0);
    const totalAdelantos = charges.filter(c => Number(c.monto) < 0).reduce((sum, c) => sum + Math.abs(Number(c.monto)), 0);

    return apiSuccess({
      cliente_id: clientId,
      nombre: client.nombre,
      saldo,
      total_entregas: totalEntregas,
      total_adelantos: totalAdelantos,
      movimientos_pendientes: charges.length,
    });
  } catch (err) {
    return apiServerError(err);
  }
}
