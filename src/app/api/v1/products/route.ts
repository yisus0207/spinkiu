import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiCreated, apiError, apiServerError } from '@/lib/apiResponse';

/**
 * GET /api/v1/products
 * Lista todos los productos/servicios del catálogo del negocio.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('negocio_id', auth.negocioId)
      .order('nombre', { ascending: true });

    if (error) throw error;

    return apiSuccess(data || [], { count: data?.length || 0 });
  } catch (err) {
    return apiServerError(err);
  }
}

/**
 * POST /api/v1/products
 * Crea un nuevo producto en el catálogo.
 * 
 * Body: {
 *   nombre: string,
 *   precio: number,
 *   codigo?: string,
 *   stock?: number | null   // null = ilimitado (servicio)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();

    if (!body.nombre || !body.nombre.trim()) {
      return apiError('El campo "nombre" es obligatorio.');
    }

    const precio = parseFloat(body.precio);
    if (isNaN(precio) || precio < 0) {
      return apiError('El campo "precio" debe ser un número mayor o igual a 0.');
    }

    const newProduct = {
      negocio_id: auth.negocioId,
      nombre: body.nombre.trim(),
      precio,
      codigo: body.codigo?.trim() || '',
      stock: body.stock !== undefined ? body.stock : null,
    };

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(newProduct)
      .select()
      .single();

    if (error) throw error;

    return apiCreated(data);
  } catch (err) {
    return apiServerError(err);
  }
}
