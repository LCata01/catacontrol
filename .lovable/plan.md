## Gestión de usuarios por boliche desde panel de catapein

### Problema
Hoy `/platform` solo lista/crea boliches. No hay forma de ver ni crear usuarios dentro de cada boliche desde catapein. Cuando se crea un boliche nuevo no tiene ningún usuario → nadie puede loguearse en ese tenant.

### Solución

**1. Nueva vista: detalle de boliche**

En la tabla de boliches del panel platform, agregar botón **"Gestionar"** en cada fila → abre nueva ruta `/platform/company/$companyId`.

Esa pantalla muestra:
- Header con nombre + código del boliche
- Tabla de usuarios del tenant: `username`, `display_name`, `rol`, `activo`
- Botón **"+ Nuevo usuario"** (abre modal)
- Por cada usuario: botones **Editar** (cambiar nombre, password, rol) y **Activar/Desactivar**
- Botón "Volver" a `/platform`

**2. Nuevas server functions** (en `src/lib/platform-users.functions.ts`)

Todas protegidas por `requireSupabaseAuth` + check `is_platform_admin`:

- `listCompanyUsers({ companyId })` → devuelve profiles + roles del boliche
- `createCompanyUser({ companyId, username, displayName, password, role })` → crea en `auth.users` con email sintético `username@<CODE>.cata.local`, inserta en `profiles` con `company_id`, inserta `user_roles`
- `updateCompanyUser({ targetUserId, username?, displayName?, password?, role?, active? })` → valida que el target pertenezca al boliche, actualiza campos
- `deleteCompanyUser({ targetUserId })` → opcional, mejor solo desactivar

**3. Modal de creación**

Form con: usuario, nombre completo, contraseña (con `PasswordInput`), rol (select: superadmin / cashier / disabled). Validar unicidad de username dentro del tenant.

**4. Detalle técnico clave**

- El `is_platform_admin` ya existe en DB → usarlo en cada handler antes de tocar nada
- Usar `supabaseAdmin` para crear users (igual que `admin-users.functions.ts` actual)
- Email sintético debe seguir el patrón multi-tenant existente: `<username>@<COMPANY_CODE>.cata.local` para no chocar con usuarios de otros boliches
- Al insertar en `profiles` y `user_roles`, setear `company_id` explícito (no usar `current_company_id()` porque catapein no tiene company)

### Archivos

**Nuevos:**
- `src/lib/platform-users.functions.ts`
- `src/routes/platform.company.$companyId.tsx`

**Modificados:**
- `src/routes/platform.tsx` — agregar columna "Gestionar" con `<Link>` al detalle

### Flujo final
catapein crea boliche → entra a "Gestionar" → crea el primer superadmin del boliche → ese superadmin ya puede loguearse en `/tenant-login` con código + contraseña, y después en `/login` con sus credenciales.

---

¿Te parece bien así o querés que también incluya:
- (a) un atajo "crear superadmin inicial" automático al crear el boliche (1 sola pantalla)
- (b) ver/cerrar turnos abiertos del boliche desde catapein
- (c) ver métricas básicas (cantidad de ventas, usuarios activos) por boliche