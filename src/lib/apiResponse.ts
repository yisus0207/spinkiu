import { NextResponse } from 'next/server';

/**
 * Respuesta JSON exitosa con código 200.
 */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({
    ok: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

/**
 * Respuesta JSON exitosa para creación (201).
 */
export function apiCreated<T>(data: T) {
  return NextResponse.json(
    { ok: true, data },
    { status: 201 }
  );
}

/**
 * Respuesta de error con código y mensaje descriptivo.
 */
export function apiError(message: string, status: number = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

/**
 * Respuesta 404 — Recurso no encontrado.
 */
export function apiNotFound(resource: string = 'Recurso') {
  return apiError(`${resource} no encontrado.`, 404);
}

/**
 * Respuesta 401 — No autenticado.
 */
export function apiUnauthorized(message: string = 'API Key inválida o no proporcionada.') {
  return apiError(message, 401);
}

/**
 * Respuesta 500 — Error interno del servidor.
 */
export function apiServerError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Error interno del servidor.';
  console.error('[Spinkiu API Error]', err);
  return apiError(message, 500);
}
