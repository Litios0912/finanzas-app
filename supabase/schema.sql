-- =============================================
-- ESQUEMA COMPLETO: Finanzas Compartidas
-- =============================================

-- 1. TABLA DE FAMILIAS
CREATE TABLE familias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_invitacion TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PERFILES DE USUARIO (se crea al registrarse)
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  familia_id UUID REFERENCES familias(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CATEGORÍAS (cada familia tiene las suyas)
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id UUID NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fijo', 'dinamico', 'ahorro', 'casa')),
  icono TEXT DEFAULT '📦',
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. GASTOS FIJOS
CREATE TABLE gastos_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id UUID NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  dia_pago INTEGER NOT NULL CHECK (dia_pago BETWEEN 1 AND 31),
  activo BOOLEAN DEFAULT true,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. GASTOS DINÁMICOS
CREATE TABLE gastos_dinamicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id UUID NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  concepto TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. AHORROS / METAS
CREATE TABLE ahorros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id UUID NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  meta_monto DECIMAL(12,2) NOT NULL,
  monto_actual DECIMAL(12,2) DEFAULT 0,
  fecha_limite DATE,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. GASTOS DE CASA (hipoteca, renta, servicios, mantenimiento)
CREATE TABLE casa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id UUID NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('hipoteca', 'renta', 'servicio', 'mantenimiento')),
  nombre TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  dia_pago INTEGER NOT NULL CHECK (dia_pago BETWEEN 1 AND 31),
  activo BOOLEAN DEFAULT true,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. HISTORIAL DE PAGOS (para llevar tracking)
CREATE TABLE historial_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id UUID NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  referencia_id UUID NOT NULL,
  referencia_tipo TEXT NOT NULL CHECK (referencia_tipo IN ('fijo', 'casa', 'ahorro')),
  monto DECIMAL(12,2) NOT NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  pagado_por UUID REFERENCES perfiles(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Perfiles: solo lectura/escritura del propio perfil
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY perfiles_select ON perfiles
  FOR SELECT USING (true);
CREATE POLICY perfiles_insert ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY perfiles_update ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- Familias: ver y unirse
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
CREATE POLICY familias_select ON familias
  FOR SELECT USING (true);
CREATE POLICY familias_insert ON familias
  FOR INSERT WITH CHECK (true);

-- Categorías: solo la propia familia
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY categorias_select ON categorias
  FOR SELECT USING (
    familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid())
  );
CREATE POLICY categorias_insert ON categorias
  FOR INSERT WITH CHECK (
    familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid())
  );
CREATE POLICY categorias_update ON categorias
  FOR UPDATE USING (
    familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid())
  );
CREATE POLICY categorias_delete ON categorias
  FOR DELETE USING (
    familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid())
  );

-- Resto de tablas: misma lógica de familia
CREATE POLICY gastos_fijos_select ON gastos_fijos FOR SELECT
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY gastos_fijos_insert ON gastos_fijos FOR INSERT
  WITH CHECK (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY gastos_fijos_update ON gastos_fijos FOR UPDATE
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY gastos_fijos_delete ON gastos_fijos FOR DELETE
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));

CREATE POLICY gastos_dinamicos_select ON gastos_dinamicos FOR SELECT
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY gastos_dinamicos_insert ON gastos_dinamicos FOR INSERT
  WITH CHECK (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY gastos_dinamicos_update ON gastos_dinamicos FOR UPDATE
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY gastos_dinamicos_delete ON gastos_dinamicos FOR DELETE
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));

CREATE POLICY ahorros_select ON ahorros FOR SELECT
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY ahorros_insert ON ahorros FOR INSERT
  WITH CHECK (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY ahorros_update ON ahorros FOR UPDATE
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY ahorros_delete ON ahorros FOR DELETE
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));

CREATE POLICY casa_select ON casa FOR SELECT
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY casa_insert ON casa FOR INSERT
  WITH CHECK (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY casa_update ON casa FOR UPDATE
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY casa_delete ON casa FOR DELETE
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));

CREATE POLICY historial_select ON historial_pagos FOR SELECT
  USING (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));
CREATE POLICY historial_insert ON historial_pagos FOR INSERT
  WITH CHECK (familia_id IN (SELECT familia_id FROM perfiles WHERE id = auth.uid()));

-- =============================================
-- FUNCIONES ÚTILES
-- =============================================

-- Generar código único de invitación
CREATE OR REPLACE FUNCTION generar_codigo_invitacion()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$;
