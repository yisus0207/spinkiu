import { supabaseAdmin, isAdminConfigured } from './supabaseAdmin';
import { apiUnauthorized, apiError } from './apiResponse';
import crypto from 'crypto';

/**
 * Resultado de la autenticación de API Key.
 */
export interface AuthResult {
  negocioId: string;
}

/**
 * Hashea una API Key con SHA-256 para compararla contra la base de datos.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Genera una API Key aleatoria segura (formato: sk_spinkiu_XXXX...XXXX).
 */
export function generateApiKey(): string {
  const random = crypto.randomBytes(32).toString('hex');
  return `sk_spinkiu_${random}`;
}

/**
 * Autentica un request usando el header `x-api-key`.
 * Busca el hash de la key en la tabla `api_keys` de Supabase.
 * 
 * @returns El `negocio_id` asociado a la API Key, o una Response de error.
 */
export async function authenticateRequest(
  request: Request
): Promise<AuthResult | Response> {
  // Verificar que Supabase esté configurado
  if (!isAdminConfigured) {
    return apiError(
      'El servidor no tiene configuradas las credenciales de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
      503
    );
  }

  // Extraer API Key del header
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return apiUnauthorized('Header x-api-key es requerido.');
  }

  // Hashear y buscar en la base de datos
  const keyHash = hashApiKey(apiKey);

  if (!supabaseAdmin) {
    return apiError('Supabase Admin no está inicializado.', 503);
  }

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('negocio_id, activo')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    return apiUnauthorized('API Key inválida o no encontrada.');
  }

  if (!data.activo) {
    return apiUnauthorized('Esta API Key ha sido desactivada.');
  }

  return { negocioId: data.negocio_id };
}

/**
 * Helper de tipo para verificar si el resultado de auth es un error Response.
 */
export function isAuthError(result: AuthResult | Response): result is Response {
  return result instanceof Response;
}
