-- ==========================================
-- SCHEMA PARA SUPABASE - SISTEMA DE FACTURACIÓN ACUMULATIVA E INVENTARIO
-- ==========================================

-- 1. TABLA DE PERFILES / NEGOCIOS
-- Vinculada directamente con auth.users de Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nombre_negocio TEXT NOT NULL DEFAULT 'Mi Negocio',
    nombre_propietario TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    nit TEXT DEFAULT '',
    logo_url TEXT DEFAULT '', -- Puede almacenar texto Base64 o URL
    precio_litro NUMERIC(12, 2) DEFAULT 0.00,
    precio_libra NUMERIC(12, 2) DEFAULT 0.00,
    precio_unidad NUMERIC(12, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Profiles
CREATE POLICY "Permitir lectura de perfil propio" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Permitir inserción de perfil propio" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Permitir actualización de perfil propio" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);


-- 2. TABLA DE EMPLEADOS
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    permisos JSONB NOT NULL DEFAULT '["dashboard", "clients"]'::jsonb, -- Array de módulos permitidos
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Employees
CREATE POLICY "Permitir gestión de empleados al administrador/negocio" ON public.employees
    FOR ALL USING (auth.uid() = negocio_id) WITH CHECK (auth.uid() = negocio_id);

CREATE POLICY "Permitir lectura de su propio registro de empleado" ON public.employees
    FOR SELECT USING (auth.uid() = id);


-- 3. TABLA DE INVENTARIO / PRODUCTOS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    codigo TEXT DEFAULT '',
    nombre TEXT NOT NULL,
    precio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER DEFAULT NULL, -- NULL significa ilimitado (ej. servicios)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Products (Dueños y empleados autorizados de ese negocio)
CREATE POLICY "Permitir todas las acciones de productos para el negocio dueño" ON public.products
    FOR ALL USING (
        auth.uid() = negocio_id OR 
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = products.negocio_id)
    ) WITH CHECK (
        auth.uid() = negocio_id OR 
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = products.negocio_id)
    );


-- 4. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    observaciones TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Clients (Dueño y empleados autorizados del negocio)
CREATE POLICY "Permitir todas las acciones de clientes para el negocio" ON public.clients
    FOR ALL USING (
        auth.uid() = negocio_id OR 
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = clients.negocio_id)
    ) WITH CHECK (
        auth.uid() = negocio_id OR 
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = clients.negocio_id)
    );

CREATE INDEX IF NOT EXISTS idx_clients_negocio ON public.clients(negocio_id);
CREATE INDEX IF NOT EXISTS idx_clients_nombre ON public.clients(nombre);


-- 5. TABLA DE FACTURAS
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    negocio_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    numero_factura TEXT NOT NULL,
    fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_pagado NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deuda_pendiente NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Invoices
CREATE POLICY "Permitir todas las acciones de facturas para el negocio" ON public.invoices
    FOR ALL USING (
        auth.uid() = negocio_id OR 
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = invoices.negocio_id)
    ) WITH CHECK (
        auth.uid() = negocio_id OR 
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = invoices.negocio_id)
    );

CREATE INDEX IF NOT EXISTS idx_invoices_negocio ON public.invoices(negocio_id);
CREATE INDEX IF NOT EXISTS idx_invoices_cliente ON public.invoices(cliente_id);


-- 6. TABLA DE DETALLES DE FACTURA
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas las acciones de ítems de facturas de su negocio" ON public.invoice_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND (
                invoices.negocio_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = invoices.negocio_id)
            )
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND (
                invoices.negocio_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = invoices.negocio_id)
            )
        )
    );


-- 7. TABLA DE CARGOS ACUMULATIVOS
CREATE TABLE IF NOT EXISTS public.charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    negocio_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    descripcion TEXT NOT NULL,
    monto NUMERIC(12, 2) NOT NULL, -- Valores positivos son cargos, negativos son abonos
    tipo_movimiento TEXT CHECK (tipo_movimiento IN ('entrada', 'salida')) DEFAULT 'entrada',
    tipo_unidad TEXT CHECK (tipo_unidad IN ('litro', 'libra', 'unidad', 'muestra')),
    cantidad NUMERIC DEFAULT NULL,
    precio_unitario NUMERIC DEFAULT NULL,
    solicitado_por TEXT DEFAULT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL, -- Si es null, está pendiente de facturar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Charges
CREATE POLICY "Permitir todas las acciones de cargos para el negocio" ON public.charges
    FOR ALL USING (
        auth.uid() = negocio_id OR 
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = charges.negocio_id)
    ) WITH CHECK (
        auth.uid() = negocio_id OR 
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND employees.negocio_id = charges.negocio_id)
    );

CREATE INDEX IF NOT EXISTS idx_charges_negocio ON public.charges(negocio_id);
CREATE INDEX IF NOT EXISTS idx_charges_cliente ON public.charges(cliente_id);
CREATE INDEX IF NOT EXISTS idx_charges_invoice ON public.charges(invoice_id);


-- 8. TRIGGER AUTOMÁTICO PARA CREAR PERFIL AL REGISTRARSE EN AUTH
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, nombre_negocio, nombre_propietario, updated_at, created_at)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'nombre_negocio', 'Mi Negocio'),
        COALESCE(new.raw_user_meta_data->>'nombre_propietario', ''),
        now(),
        now()
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sobre la tabla auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 9. TABLA DE API KEYS PARA AUTENTICACIÓN EXTERNA
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,           -- Hash SHA-256 de la API key
    label TEXT DEFAULT 'default',            -- Etiqueta descriptiva (ej. "n8n")
    activo BOOLEAN DEFAULT true,             -- Permite desactivar keys
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para api_keys
CREATE POLICY "Permitir gestión de API keys al dueño del negocio" ON public.api_keys
    FOR ALL USING (auth.uid() = negocio_id) WITH CHECK (auth.uid() = negocio_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_negocio ON public.api_keys(negocio_id);

