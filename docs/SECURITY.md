# Seguridad y permisos propuestos

**Estado:** implementación por fases. El usuario confirma que RLS está aprobado. Esta sesión no repitió la matriz con identidades separadas ni verificó el historial remoto. La RPC geográfica anónima y la lectura posterior de catálogo respondieron HTTP 200 con un resultado cada una; falta validar el flujo de búsqueda en la interfaz.

La migración de Fase 6 (`202611230003_properties.sql`) activa RLS y revoca grants amplios en propiedades, asignaciones, imágenes y características. El usuario informa que la aplicó sin error; las policies aún requieren pruebas negativas con distintas identidades. Visitantes solo consultan publicaciones aprobadas públicas/ambas; usuarios autenticados también pueden consultar asignaciones propias como agente y Admin puede operar el inventario. Las policies de `storage.objects` vinculan el objeto del bucket privado con su metadata y publicación; escritura queda reservada a Admin en esta etapa.

La migración adicional `202611230004_property_price_history.sql` registra cambios de precio con un trigger `SECURITY DEFINER` en la misma transacción del `UPDATE`; los roles de aplicación solo tienen lectura y no reciben INSERT/UPDATE/DELETE sobre el historial. El usuario confirma que el historial funciona; la prueba SQL independiente de RLS/inmutabilidad sigue pendiente.

La migración preparada `202611230005_geospatial_search.sql` expone búsqueda por radio como función `SECURITY INVOKER`: rangos y límites se validan en SQL, y RLS/grants de `properties` siguen controlando las filas devueltas. Solo incluye propiedades aprobadas de visibilidad pública/ambas. El usuario reporta habilitar PostGIS en `extensions`; una consulta confirma columna y RPC presentes, aunque falta probar búsqueda con datos reales. La geocodificación no debe enviar información personal ni activarse como autocompletado indiscriminado.

La migración 0006 (el usuario reporta haberla aplicado) define acceso Premium con `private.has_active_premium_membership()` y una RPC `SECURITY DEFINER` que verifica usuario Cliente activo, plan vigente y resultado simulado permitido. Suscripciones y simulaciones solo son legibles por su titular o Admin; no tienen escritura directa desde clientes autenticados. Las propiedades Premium, sus imágenes y características requieren entitlement vigente mediante RLS, también en `storage.objects`. Los resultados son ficticios y no hay cargos reales ni datos bancarios.

La migración 0007 añade cancelación por RPC: el Cliente solo cancela sus periodos activos vigentes; Admin puede cancelar una suscripción concreta. Cada periodo cancelado genera su propia fila de auditoría con el ID de suscripción correspondiente. No hay UPDATE/DELETE de `subscriptions` para el rol autenticado. El usuario confirma que el flujo Premium funciona; las pruebas negativas automatizadas de RLS quedan para Fase 14.

## Roles

- **Cliente:** accede a propiedades publicadas según visibilidad; gestiona su perfil permitido, favoritos, listas, visitas, preferencias y actividad propia.
- **Premium:** no es un rol. Se deriva en servidor de una suscripción activa y no vencida. Una restricción Premium debe verificarse en la consulta/caso de uso, además del RLS que corresponda.
- **Agente:** accede a propiedades asignadas y CRM/visitas de su asignación; puede crear o editar según política configurable y flujo de aprobación. No puede cambiar su propio rol ni ampliar asignaciones.
- **Admin:** acceso global mediante verificación segura de servidor y política de base de datos restringida.

## Fuente de autoridad y RLS

`auth.uid()` identifica al usuario. El rol reside en `profiles.base_role`, que el usuario no puede actualizar. El estado `account_status` también lo controla Admin. Nunca confiar en `user_metadata`, campos del formulario o JWT custom metadata que el usuario pueda cambiar. Premium sigue siendo una suscripción vigente, no un rol.

La migración crea helpers `private.current_profile_role()` y `private.is_active_admin()` como `SECURITY DEFINER`: tienen `search_path` vacío, nombres cualificados y `EXECUTE` solo para `authenticated`. El segundo también exige `account_status = active`, incluso para la cuenta Admin. Evitan recursión al consultar `profiles` desde su propia policy. El RPC `public.admin_set_profile_access` valida actor, rol solicitado, estado y objetivo; bloquea auto-modificación y registra el cambio en `audit_logs` en la misma transacción. Sigue el patrón recomendado por [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Matriz de políticas planeada

- `profiles`, `user_preferences`: `SELECT`/`UPDATE` sobre fila propia; rol/estado bloqueados por columna o RPC segura. Datos públicos de agentes se exponen con vista limitada.
- `agents`: público solo lee perfiles publicados de cuentas Agente activas; cada agente puede leer su propia fila; Admin activo administra perfiles de cuentas Agente. Agentes no editan los campos profesionales desde su cuenta.
- `agent_assignments`: Admin activo crea o revoca asignaciones; la Server Action deriva `assigned_by` de la sesión. La migración 0012 concede `SELECT` a authenticated bajo RLS y restringe lectura propia a agentes activos con asignación vigente. El usuario confirma que cartera y asignaciones funcionan tras aplicarla; pruebas independientes por rol quedan en Fase 14.
- `properties`, `property_images`, `property_features`: público solo aprobado/activo y visibilidad aplicable; agente solo asignadas o creadas con permiso; admin global. `INSERT/UPDATE/DELETE` verifican actor y asignación en servidor y RLS.
- asignaciones, historial de precio, auditoría: escrituras por flujo/función autorizada; lectura acotada; usuarios normales no alteran historiales.
- favoritos/listas/actividad: CRUD únicamente por dueño; claves FK impiden referenciar recursos inexistentes.
- visitas: cliente ve las suyas; agente asignado las administra; admin global. Evitar que estados se muten libremente por cliente.
- availability: agente gestiona la propia; lectura pública limitada a franjas reservables; admin supervisa.
- leads/interacciones/etapas: la migración 0013 concede SELECT solo a Admin activo y agente asignado activo; las notas son interacciones internas con actor de sesión; Cliente no consulta CRM. El visitante envía al endpoint `POST /api/crm/property-inquiry`, que valida el origen canónico (mismo host solo en desarrollo), formato/tamaño del body, honeypot y campos; el RPC SQL vuelve a validar consentimiento y propiedad activa/publicable, y limita tres envíos por correo/propiedad/hora.
- favoritos: la migración 0014 concede acceso a filas propias solo a Clientes activos. La propiedad referenciada también debe ser legible por RLS; no se aceptan favoritos de propiedades privadas/invisibles. El usuario confirma CRM funcional (0013) y esta sesión no inspeccionó el estado remoto.
- listas: la migración 0015 limita CRUD de listas e items al Cliente activo propietario. La inserción de `favorite_list_properties` exige propiedad visible y favorito propio; las acciones vuelven a comprobar rol en servidor.
- actividad: la migración 0016 solo concede SELECT del propio Cliente activo y no permite INSERT directo por Data API. La RPC valida cuenta activa, categoría permitida, publicación/visibilidad y Premium vigente; no acepta ID de usuario, metadata, IP ni texto libre. El límite es de 500 filas por titular.
- notificaciones: la migración 0017 solo expone filas propias a Clientes activos y concede UPDATE de `read_at` únicamente. Triggers SECURITY DEFINER derivan el destinatario desde la fila CRM/suscripción; ningún ID de usuario o texto del navegador decide al receptor.
- comparación: guarda como máximo cuatro IDs en `localStorage`; no almacena contactos ni otra información sensible. La página vuelve a consultar propiedades mediante el repositorio público, por lo que IDs retirados o no visibles no deben revelar sus datos.
- planes: lectura de planes activos; cambios solo admin.
- subscriptions/payments: cliente puede consultar las propias; creación y cambio de estado solo mediante servicio/RPC autorizada; admin con auditoría. Nunca aceptar estado de pago del browser como verdad.
- analytics: el endpoint de vistas acepta solo dos UUIDs y origen same-origin; la RPC vuelve a validar visibilidad, deduplica por ficha/sesión/día y limita a 30 fichas por sesión/día. No conserva IP ni identidad. Eventos privados sin SELECT directo; solo RPC agregado protegido por Admin puede consultar conteos. Retención de 90 días con limpieza oportunista. El usuario confirma que el tracking funciona; las pruebas negativas siguen pendientes.
- El ranking de vistas usa una RPC distinta que exige Admin activo, acota el periodo a 90 días y limita el top a 20 propiedades; no devuelve sesiones ni filas de eventos. El usuario confirma que la migración 0009 funciona.
- El desglose por tipo y ciudad usa una RPC agregada que exige Admin activo y limita el periodo a 90 días; la consulta solo devuelve categorías y conteos, no eventos crudos. El usuario confirma que 0010 funciona en su entorno.
- La migración 0011 agrega `agents` con RLS y helper `SECURITY DEFINER` de cuenta Agente activa. El usuario confirma que los perfiles funcionan tras aplicarla. `/admin/agentes` vuelve a exigir Admin activo en servidor y la base de datos; la acción valida campos con Zod. Los datos públicos no incluyen correo/teléfono personal. Pruebas negativas RLS siguen en Fase 14.
- Las acciones de asignación validan UUID y guardan actor desde sesión; agente suspendido no entra a `/agente` y 0012 además bloquea lectura directa de asignaciones. El usuario confirma el flujo; la matriz independiente de roles se conserva para Fase 14.
- Migración 0013: el formulario de propiedad no crea fila directa; RPC SECURITY DEFINER vuelve a validar visibilidad, disponibilidad, cuenta autenticada activa/Cliente, consentimiento, límites y enrutamiento a agente. Datos de contacto y notas solo se exponen a Admin/agente asignado. El cliente solo puede actualizar `stage`; agente solo su lead; historial lo inserta trigger. El usuario reporta que CRM funciona; no se inspeccionó directamente el historial remoto.
- Migración 0014: `favorites` usa RLS para lectura/alta/baja del propietario si su cuenta tiene rol Cliente y estado activo. El usuario confirma el flujo, pero no inspeccionamos el estado remoto.
- Migración 0015: políticas RLS propias en `favorite_lists` y `favorite_list_properties`; solo permite incluir propiedades que el usuario tenga en favoritos y que pueda leer bajo las políticas vigentes. El usuario confirma las listas; se consideran funcionales según su reporte, sin inspección remota.
- Migración 0016: lectura propia por Cliente activo, sin escrituras directas; `record_customer_activity` es el único punto de entrada y valida los eventos. El usuario confirma el historial; 0016 se considera validada según su reporte, sin inspección remota directa.
- Migración 0017: lectura propia y marcado leído bajo RLS; inserciones solo por triggers sobre suscripciones e historial de etapa. El usuario confirma que funciona; no se inspeccionó el historial remoto.
- La descarga CSV repite autorización Admin en servidor y llama a las RPC agregadas (que también vuelven a validar Admin); responde `private, no-store`, escapa campos CSV y neutraliza prefijos de fórmula. El parámetro temporal acepta solo 7, 28 o 90 días. No exporta identificadores pseudónimos ni eventos individuales.
- Migración 0018 `site_settings`: la tabla contiene solo campos destinados a publicación (identidad, descripción y contacto público); RLS permite leer el singleton y reserva INSERT/UPDATE a Admin activo. La Server Action repite la guarda Admin, obtiene el actor de la sesión y valida con Zod. No hay DELETE ni datos comerciales precargados.
- El formulario no envía la columna `singleton` al upsert, porque no tiene grant UPDATE; PostgreSQL conserva su default `true`. Los enlaces de confirmación y recuperación apuntan al callback de la app y dependen de la lista permitida de Supabase Auth.
- Migración 0019 `agent_assignments`: corrige una policy administrativa demasiado amplia de la migración 0003. Retira DELETE y los grants de UPDATE generales, limita inserción a columnas de asignación y autor, obliga `assigned_by = auth.uid()` y permite actualizar únicamente `revoked_at` de filas activas. El usuario confirma el flujo, sin inspección remota directa.
- Migración 0020 añade un trigger `SECURITY DEFINER` sin ejecución de usuario para registrar altas y revocaciones de asignaciones en `audit_logs`, dentro de su transacción. Conserva actor y referencias de agente/propiedad sin PII. El usuario confirma su funcionamiento, sin inspección remota directa.
- Migración 0021 mueve dirección, código postal, coordenadas exactas y actores de la fila pública de `properties` a `property_private_details`, cuya lectura se limita por RLS a Admin y agente activo asignado. Revoca SELECT de tabla y concede columnas permitidas; no concede `location`, IDs de actores ni timestamps internos. También excluye `property_images.uploaded_by` y `property_price_history.changed_by`. Coordenadas públicas se redondean a tres decimales. El usuario confirma RLS aprobado; la sesión no revisó las identidades directamente.
- reports: envío limitado de reporte; reportante ve estado propio; resolución solo admin.
- notifications: lectura/actualización de lectura propia; emisión en servidor.

La política SQL exacta se definirá tabla por tabla en migraciones y se verificará contra grants; RLS no reemplaza la necesidad de no conceder privilegios innecesarios.

El panel `/admin` es de solo lectura y está protegido por la guarda Admin del layout. Consulta conteos operativos mediante la sesión del usuario/RLS y, para vistas, usa una RPC que devuelve solo agregados. No se guardan IP ni datos personales; las simulaciones Premium se identifican como pruebas y no como ingresos.

## Operaciones sensibles y amenazas

- Mantener `service_role` solo en variables de servidor. Preferir el cliente ligado a la sesión para conservar RLS; si se usa privilegio elevado, revalidar actor, permiso, entrada y registrar auditoría.
- Validar entrada con Zod en servidor; validar MIME real, tamaño, dimensiones y nombre de archivo; limitar tipos y rutas Storage; evitar SVG no sanitizado.
- El usuario decidió omitir por costo el rate limit WAF global por IP. CRM conserva límite SQL de tres envíos por correo/propiedad/hora y analítica limita sesiones a 30 vistas/día; estos controles de aplicación se pueden eludir variando correos o sesiones. Reevaluar controles adicionales si cambia el presupuesto o el riesgo.
- Usar cookies seguras/SameSite a través del patrón SSR recomendado por Supabase; comprobar sesión fresca en acciones sensibles; proteger CSRF según el mecanismo de sesión.
- Escape/sanitización de contenido y salidas; no renderizar HTML de usuario como confiable.
- No incluir PII, tokens ni cabeceras de autorización en logs. Retención mínima y eliminación de datos de analítica.
- Analítica de vistas: el UUID aleatorio de `sessionStorage` es pseudónimo y temporal, no una identidad; se cuenta como máximo una vista diaria por ficha y no se recoge IP ni agente de usuario. La retención declarada depende de que la migración 0008 esté instalada.
- `POST /api/analytics/property-view` y `POST /api/crm/property-inquiry` comparan `Origin` con `NEXT_PUBLIC_SITE_URL` o el dominio Vercel de fallback en producción (mismo host solo en desarrollo), exigen `application/json` y limitan el body durante la lectura. Analytics valida UUIDs; CRM valida Zod y honeypot. El ID de sesión lo elige el llamante. Por decisión del usuario no hay barrera WAF global por IP; los límites de aplicación se describen arriba.
- `next.config.ts` agrega `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy` que bloquea cámara/micrófono y limita geolocalización al origen propio. En Vercel también envía HSTS por un año, sin `includeSubDomains` ni `preload`; quita `X-Powered-By`. CSP sigue pendiente de revisar con los proveedores reales de imágenes/teselas.
- Cambios de precios, suscripción, publicación, roles, asignaciones y administración se auditan y deben ser atómicos cuando haya múltiples escrituras.

## Límites y pendientes

### Revisión estática incremental — 2026-11-24

- Se revisaron las migraciones de perfiles/roles, propiedades y Storage, 0019–0021, Premium, CRM, favoritos/listas, actividad y notificaciones. En el SQL inspeccionado, las operaciones sensibles conservan políticas RLS, grants acotados y comprobaciones de cuenta activa o relación con el recurso.
- 0019 elimina `DELETE` de asignaciones, restringe columnas de inserción/actualización y exige `assigned_by = auth.uid()`; 0021 revoca el `SELECT` amplio heredado y concede columnas explícitas para catálogo e imágenes. La tabla privada de propiedad concede lectura a Admin activo o agente asignado activo.
- Las funciones privilegiadas revisadas fijan `search_path` vacío y restringen `EXECUTE`; el RPC público de consulta valida publicación/visibilidad y serializa el límite por correo/propiedad.
- Esta inspección solo cubre el SQL del repositorio. No confirma migraciones instaladas ni privilegios efectivos en Supabase. Antes de cerrar la matriz hay que probar anon, Cliente activo/suspendido, Agente asignado/no asignado/suspendido y Admin activo/suspendido, incluyendo columnas privadas y objetos Storage.

No hay proyecto Supabase, políticas activas, pruebas de penetración, rate limiter ni almacenamiento configurado en Fase 0. La matriz es un diseño que deberá convertirse y probarse antes de declarar seguridad implementada.

### Fase 4 implementada en código

- El navegador solo recibe URL y publishable key; no se define ni expone `service_role`.
- Clientes Supabase separados de servidor y navegador usan `@supabase/ssr` y cookies. `src/proxy.ts` refresca/verifica claims.
- Callback acepta solo destinos locales permitidos, evitando redirección abierta.
- El trigger de perfil usa `SECURITY DEFINER` con `search_path` vacío y crea un perfil mínimo desde metadata Auth; los grants bloquean inserción directa y edición de identificadores.
- El bucket `property-images` queda privado por defecto, limitado a 10 MiB y formatos de imagen permitidos. No habrá policies de carga hasta que puedan validarse propiedad, rol y asignación.
- El usuario informa que aplicó la migración inicial y que el enlace de verificación ahora funciona; no se inspeccionó Auth remoto ni se repitió el flujo en esta sesión.

### Fase 5 preparada en código

- Roles permitidos: `client`, `agent`, `admin`; estados: `active`, `suspended`. Perfiles nuevos parten como `client` y `active`; metadatos de Auth no pueden asignar roles.
- Grants de cliente siguen limitados a `display_name`; leer perfiles ajenos requiere admin. No se conceden UPDATE directos de rol/estado.
- El RPC administrativo no permite que un admin cambie su propia cuenta. El primer Admin debe designarse manualmente por el propietario del proyecto mediante SQL Editor; después el RPC podrá usarse desde una acción de servidor autorizada.
- Cambios de rol/estado generan auditoría inmutable. `audit_logs` solo concede SELECT a Admin y la escritura ocurre dentro del RPC.
- `src/lib/permissions/access.ts` resuelve claims y perfil desde servidor; rutas privadas deben usar `requireActiveProfile` o `requireProfileRole`. El proxy refresca sesión, pero no sustituye esa autorización.
- El usuario reporta aplicar `202611230002_roles_and_permissions.sql` y designar el primer Admin. Pendiente probar cliente/agente/admin, rol inmutable, suspensión, rechazo de auto-modificación y lectura de auditoría.

## Avisos SMTP de CRM

El envío usa una contraseña de aplicación Gmail en `CRM_GMAIL_APP_PASSWORD`, variable solo de servidor. El destinatario está fijo al correo del proyecto; el correo validado del visitante solo se usa como Reply-To. Los datos proceden del formulario ya validado en servidor. SMTP no se ejecuta cuando la RPC rechaza la consulta. La migración 0023 desactiva las funciones de respuesta/cola de 0022. Aún no se ha comprobado entrega real ni estado remoto de la migración.
