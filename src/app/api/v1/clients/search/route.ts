import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiSuccess, apiError, apiServerError } from '@/lib/apiResponse';

/**
 * GET /api/v1/clients/search?q=nombre
 * Busca proveedores por nombre (búsqueda parcial, case-insensitive).
 * Ideal para uso desde n8n/WhatsApp cuando el usuario dice "Don Manuel".
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const query = request.nextUrl.searchParams.get('q');

    if (!query || !query.trim()) {
      return apiError('El parámetro de búsqueda "q" es requerido. Ejemplo: /api/v1/clients/search?q=Manuel');
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('negocio_id', auth.negocioId)
      .ilike('nombre', `%${query.trim()}%`)
      .order('nombre', { ascending: true })
      .limit(10);

    if (error) throw error;

    return apiSuccess(data || [], { query: query.trim(), count: data?.length || 0 });
  } catch (err) {
    return apiServerError(err);
  }
}
