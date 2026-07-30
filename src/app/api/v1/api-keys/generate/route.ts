import { NextRequest } from 'next/server';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabaseAdmin';
import { hashApiKey, generateApiKey } from '@/lib/apiAuth';
import { apiCreated, apiError, apiServerError } from '@/lib/apiResponse';

/**
 * POST /api/v1/api-keys/generate
 * Genera una nueva API Key para un negocio.
 * 
 * IMPORTANTE: Este endpoint usa autenticación por Supabase Auth (Bearer token)
 * en vez de API Key, ya que es el endpoint que CREA las API Keys.
 * 
 * Headers: Authorization: Bearer <supabase_access_token>
 * Body: { label?: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured) {
      return apiError('Supabase no está configurado en el servidor.', 503);
    }

    // Autenticación por Bearer token de Supabase
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Se requiere header Authorization: Bearer <token> para generar API Keys.', 401);
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificar el token con Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return apiError('Token de autenticación inválido o expirado.', 401);
    }

    // El negocio_id es el ID del usuario (dueño del negocio)
    const negocioId = user.id;

    // Verificar que existe un perfil para este usuario
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', negocioId)
      .single();

    if (!profile) {
      return apiError('No se encontró un perfil de negocio asociado a tu cuenta.', 404);
    }

    const body = await request.json().catch(() => ({}));
    const label = body.label?.trim() || 'default';

    // Generar API Key y su hash
    const plainKey = generateApiKey();
    const keyHash = hashApiKey(plainKey);

    // Guardar el hash en la base de datos
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        negocio_id: negocioId,
        key_hash: keyHash,
        label,
        activo: true,
      })
      .select('id, label, activo, created_at')
      .single();

    if (error) throw error;

    return apiCreated({
      api_key: plainKey,
      id: data.id,
      label: data.label,
      mensaje: '⚠️ GUARDA ESTA API KEY EN UN LUGAR SEGURO. No se puede recuperar después de este momento.',
    });
  } catch (err) {
    return apiServerError(err);
  }
}
