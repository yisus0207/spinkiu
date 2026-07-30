import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { nombre, email, permisos, negocioId } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase Service Role Key no configurada en el servidor. No se pueden realizar acciones administrativas.' },
        { status: 500 }
      );
    }

    // Cliente administrativo con privilegios de bypass
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Invitar al usuario a través de Supabase Auth
    const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          nombre_propietario: nombre,
        }
      }
    );

    if (inviteError) {
      // Si el usuario ya existe en auth, ver si podemos asociarlo
      if (inviteError.status === 422) {
        return NextResponse.json(
          { error: 'Este correo electrónico ya tiene una invitación activa o cuenta en Supabase Auth.' },
          { status: 400 }
        );
      }
      throw inviteError;
    }

    if (!authData?.user) {
      throw new Error('No se pudo crear el registro del usuario en la base de datos de autenticación.');
    }

    // 2. Crear la fila correspondiente en la tabla employees del esquema público
    const newEmployee = {
      id: authData.user.id,
      negocio_id: negocioId,
      nombre,
      email,
      permisos
    };

    const { data: dbData, error: dbError } = await supabaseAdmin
      .from('employees')
      .insert(newEmployee)
      .select()
      .single();

    if (dbError) {
      // Rollback simple de la cuenta creada en auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw dbError;
    }

    return NextResponse.json({ 
      message: 'Invitación enviada exitosamente por correo electrónico.',
      employee: dbData 
    });

  } catch (err: any) {
    console.error('Error en invite API:', err);
    return NextResponse.json(
      { error: err.message || 'Error en la llamada interna del servidor' },
      { status: 500 }
    );
  }
}
