## Refactor multi-tenant para CATACONTROL

Convertir la app de single-tenant (TEMPLO) a SaaS multi-tenant con aislamiento total por boliche, sin romper ventas ni impresión.

---

### 1. Nueva entidad `companies` (tenants)

Crear tabla `companies`:
- `id` (uuid)
- `name` (texto, ej. "Templo")
- `code` (texto único, ej. "TEMPLO" — usado para login)
- `password_hash` (texto, bcrypt)
- `active` (bool)
- `subdomain` (texto, nullable — para futuro `templo.catacontrol.app`)
- `created_at`

Seed inicial: insertar **TEMPLO** con un código y contraseña que vos definas (te la pido al aprobar el plan).

---

### 2. Agregar `company_id` a TODAS las tablas de negocio

Tablas a migrar:
`profiles`, `user_roles`, `bars`, `entries`, `events`, `products`, `product_categories`, `staff_members`, `staff_categories`, `ticket_types`, `wristbands`, `shifts`, `sales`, `sale_items`, `staff_consumptions`, `complimentary_tickets`, `app_settings`, `audit_logs`.

Pasos por tabla:
- `ALTER TABLE … ADD COLUMN company_id uuid REFERENCES companies(id)`
- Backfill: todas las filas existentes → `company_id = TEMPLO.id`
- `ALTER … SET NOT NULL` (donde aplique)
- Índice por `company_id`
- Reescribir RLS para filtrar por `company_id = current_company_id()`

`app_settings` deja de ser single-row global; pasa a tener un row por tenant (PK compuesta `company_id`).

---

### 3. Doble autenticación (boliche + usuario)

**Pantalla 1 — Login de boliche** (`/tenant-login`):
- Inputs: código del boliche + contraseña
- Verifica contra `companies` vía server function (bcrypt)
- Devuelve un JWT firmado de tenant (expira en 30 días) → guardado en `localStorage` como `cata_tenant_token`
- Redirige a `/login`

**Pantalla 2 — Login de usuario** (login actual, sin cambios visuales):
- Antes de permitir login, verifica que exista `cata_tenant_token` válido
- El email sintético pasa de `usuario@cata.local` a `usuario@<companycode>.cata.local` para garantizar unicidad cross-tenant en `auth.users`
- Resto del flujo Supabase Auth igual

**Persistencia**: el token de tenant sobrevive a logout de usuario; solo se borra con un botón explícito "Cambiar boliche".

---

### 4. Aislamiento por tenant (RLS)

Crear función `current_company_id()`:
- Lee el `company_id` del JWT del usuario (claim custom) **o** del `profiles.company_id` del usuario logueado
- `SECURITY DEFINER`, `STABLE`

Reescribir todas las policies actuales:
```sql
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id())
```

Para superadmin de tenant: igual + filtro por su company.
Para **superadmin global** (nuevo rol `platform_admin`): bypass total.

---

### 5. Nuevo rol `platform_admin` (superadmin global)

- Nuevo valor en enum `app_role`: `platform_admin`
- Puede: crear/desactivar boliches, resetear passwords de tenant, ver métricas globales
- Nueva ruta `/platform` con: lista de companies, crear nuevo boliche, toggle activo, reset password
- NO ve datos de negocio de los tenants (a menos que explícitamente seleccione "ver como…")

El `superadmin` actual (de TEMPLO) **NO** se promueve automáticamente — sigue siendo admin de su tenant.

---

### 6. UI

- `TopBar` muestra: `CATACONTROL — <NOMBRE_BOLICHE>` (leído de `companies` via context)
- Nuevo `TenantContext` que expone `company` actual a toda la app
- Botón "Cambiar boliche" en logout dropdown
- Login screen: pequeño chip arriba mostrando "Boliche: TEMPLO" para confirmar tenant antes de poner credenciales de usuario

---

### 7. Server functions nuevas

- `tenantLogin({ code, password })` → devuelve token tenant + datos company
- `verifyTenantToken(token)` → middleware para proteger las demás server fns
- `createCompany({ name, code, password })` → solo platform_admin
- `togglecompany`, `resetCompanyPassword`, `listCompanies`, `platformMetrics`

Cada server function de negocio existente (`admin-users.functions.ts`, etc.) recibe middleware adicional que valida tenant token + inyecta `company_id` en el contexto.

---

### 8. Subdominios futuros (preparación, no activación)

- Guardar `subdomain` en `companies`
- Helper `detectTenantFromHost()` que lee `window.location.hostname`: si es `<sub>.catacontrol.app`, autoselecciona ese tenant y salta la pantalla 1
- No se activa hasta que configures DNS wildcard

---

### 9. Compatibilidad

- **No tocar**: `src/lib/printer.ts`, lógica de ventas (`bar.tsx`, `entry.tsx`, sales/sale_items inserts)
- Solo se agrega `company_id` automático en los inserts (vía default a nivel de DB usando `current_company_id()` como `DEFAULT`)
- Reportes, cajas, tickets, eventos: idénticos en UI; el filtrado por tenant ocurre en RLS, transparente

---

### Detalles técnicos

**Migración SQL** (1 sola, grande):
1. `CREATE TABLE companies`
2. Insert TEMPLO
3. Por cada tabla: `ADD COLUMN company_id`, backfill, `NOT NULL`, índice, `DEFAULT public.current_company_id()`
4. `CREATE FUNCTION current_company_id()`
5. Drop + recreate de todas las RLS policies con filtro tenant
6. Agregar `platform_admin` al enum `app_role`
7. Trigger en `auth.users` insert → asignar `company_id` a `profiles` desde claim/email parsing

**Token tenant**: JWT firmado con `JWT_SECRET` (nuevo secret) — payload `{ company_id, code, exp }`. Verificado server-side en cada server fn protegida.

**Archivos nuevos**:
- `src/routes/tenant-login.tsx`
- `src/routes/platform.tsx` + sub-rutas
- `src/lib/tenant-context.tsx`
- `src/lib/tenant.functions.ts` (login, verify, list, create, etc.)
- `src/lib/companies.functions.ts`

**Archivos modificados**:
- `src/lib/auth-context.tsx` (añade tenant)
- `src/components/Guard.tsx` (chequea tenant token)
- `src/components/TopBar.tsx` (muestra nombre boliche)
- `src/routes/login.tsx` (chip tenant + redirect a `/tenant-login` si falta token)
- `src/routes/index.tsx` (redirect a `/tenant-login` si falta)
- `src/start.ts` (registrar middleware tenant)

---

### Antes de implementar, necesito que me confirmes:

1. **Contraseña inicial para TEMPLO** (la del boliche, no la de los usuarios). Sugerencia: `templo2026`
2. **Email del platform_admin global** que vas a usar (puede ser un usuario nuevo tipo `lovable / xxxx`)
3. ¿Querés que la pantalla de selección de boliche tenga un dropdown con la lista de boliches activos, o input libre tipo "código + password"? (recomiendo input libre por seguridad)

Cuando confirmes esos 3 puntos arranco con la migración + código.
