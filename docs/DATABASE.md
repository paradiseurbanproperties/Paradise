# Modelo inicial de datos

**Estado:** modelo objetivo; el usuario reporta que aplicó las migraciones `202611230001_auth_foundation.sql` y `202611230002_roles_and_permissions.sql`, y confirma que RLS está aprobado. La sesión no reprodujo la matriz ni verificó el estado remoto de las migraciones. Todas las entidades tendrán UUID como clave primaria salvo catálogos pequeños. Se usarán `timestamptz` en UTC, claves foráneas explícitas, restricciones e índices. Tablas expuestas por Data API tendrán RLS y privilegios mínimos.

## Esquema versionado implementado en Fase 6

La migración `202611230003_properties.sql` define `properties`, `agent_assignments`, `property_images`, `property_features` y `property_feature_values`, con claves foráneas, restricciones, índices y RLS. El usuario informa que la aplicó sin error. `202611230004_property_price_history.sql` añade valores anterior/nuevo, actor, fecha y motivo opcional con trigger transaccional, acceso de lectura por visibilidad y sin grants de modificación directa; el usuario confirmó que el historial funciona. El catálogo siempre consulta Supabase; una conexión ausente o inventario vacío produce un estado vacío, sin filas locales de reemplazo.

### Inventario actual

El usuario reporta que las doce propiedades ya están guardadas en Supabase. Se gestionan desde la lista y los formularios CRUD de `/admin/propiedades`, igual que cualquier otra fila. Las migraciones `202611250024_property_visits.sql` y `202611250025_property_inventory_standardization.sql` mantienen la misma autorización y las mismas funciones de catálogo; 0025 normaliza los slugs, descripción, textos alternativos y ubicación interna sin cambiar IDs ni relaciones.

- `properties` conserva la ficha, precio, ubicación, coordenadas, estado comercial, visibilidad y moderación. `created_by` y `approved_by` enlazan a `profiles`.
- `agent_assignments` enlaza agentes (`profiles`) y propiedades; una asignación puede revocarse y solo puede existir una asignación activa por pareja.
- `property_images` guarda FK a inmueble, ruta única de Storage, texto alternativo, orden, portada, MIME, tamaño y autor. Un índice parcial asegura una sola portada actual.
- `property_features` normaliza el catálogo de características y `property_feature_values` guarda su valor estructurado por inmueble.
- El bucket `property-images` es privado. Los archivos se almacenan bajo `{property_id}/{image_id}.{ext}`; el binario vive en Storage y su metadata en Postgres dentro del mismo proyecto Supabase. El borrado de una fila metadata no elimina automáticamente el objeto Storage, por lo que el flujo de borrado debe coordinar ambas operaciones y limpiar huérfanos.

En este primer incremento las escrituras de propiedades, asignaciones y fotografías están reservadas a Admin. Agentes asignados pueden leer sus fichas/fotos aunque estén en borrador. Visitantes solo leen fichas aprobadas y de visibilidad pública/ambas. Las publicaciones de visibilidad Premium se leen con la membresía vigente de Fase 8.

## Identidad y permisos

- `profiles`: `id` (PK/FK a `auth.users.id`), `display_name`, `phone`, `avatar_path`, `base_role` (`client|agent|admin`), `status`, `created_at`, `updated_at`. El usuario no puede actualizar su rol o estado privilegiado.
- `user_preferences`: `user_id` (PK/FK), `theme` (`light|dark|system`), preferencias no sensibles y marcas de tiempo.
- `agents`: `profile_id` (PK/FK a profiles), slug, nombre público, biografía, especialidades, zonas de servicio y bandera de publicación. No duplica ni publica datos de contacto personales.
- `agent_assignments`: PK compuesta (`agent_id`, `property_id`), asignador y fecha; relaciona agentes con propiedades.

Supabase Auth mantiene credenciales, verificación y recuperación; no duplicarlas en `profiles`.

Fase 4 crea `profiles(id FK auth.users, display_name, created_at, updated_at)`, trigger de alta, RLS de lectura/actualización propia y privilegios limitados para actualizar solo `display_name`. Fase 5 añade `base_role` (`client|agent|admin`) y `account_status` (`active|suspended`), bloqueados para cambios directos del usuario. `private.current_profile_role()` permite que RLS lea el rol del actor; `public.admin_set_profile_access(...)` valida cambios hechos por Admin a otra cuenta y registra antes/después en `audit_logs`.

## Propiedades y catálogo

- `properties`: UUID, `title`, `slug` único, `description`, `price`/moneda, `property_type`, características físicas, ciudad/estado/barrio, coordenadas públicas aproximadas, estado, visibilidad y publicación. Los grants de lectura solo habilitan las columnas usadas por catálogo/operación.
- `property_private_details` (migración 0021): dirección, código postal, coordenadas exactas, creador y aprobador; RLS permite lectura a Admin activo y agente asignado activo. Los grants de SELECT limitan además las columnas a dirección, código postal, coordenadas y FK de propiedad; un trigger sincroniza una coordenada redondeada a la tabla pública.
- `property_images`: UUID, FK property, `storage_path`, texto alternativo, orden, `is_cover`, MIME/tamaño y fecha. `uploaded_by` queda fuera de grants de lectura pública. Restricción para una imagen de portada por propiedad mediante índice parcial.
- `property_features`: catálogo de características normalizadas (nombre y tipo).
- `property_feature_values`: relación propiedad-característica y valor tipado o texto controlado; unicidad por propiedad y característica.
- `property_price_history`: UUID, propiedad, precio anterior/nuevo, moneda e instante. El actor interno no se concede a anon/authenticated. Inserción transaccional junto al cambio del precio.
- `agent_assignments`: asignaciones activas de agentes; conservar historial mediante fechas o eventos de auditoría, a decidir en migración.

La ubicación indexada PostGIS se sincroniza con la coordenada aproximada pública. La migración 0021 mueve direcciones y ubicación exacta a `property_private_details`; solo Admin/agente asignado pueden leerla. La Data API del catálogo no concede SELECT a `location` ni a las columnas privadas.

### Persistencia de propiedades e imágenes

Cada inmueble tiene una fila en `properties`, y cada fotografía asociada tiene su propia fila en `property_images` con FK a la propiedad, ruta Storage, texto alternativo, orden e indicador de portada. Los archivos binarios se guardan en Supabase Storage del mismo proyecto, no en columnas `bytea` de PostgreSQL; la ruta y metadatos persistidos en Postgres mantienen la relación consultable entre ficha e imágenes. La aplicación lee el catálogo y metadata desde Supabase y sirve las fotos desde Storage con reglas acordes al estado de publicación y visibilidad.

El bucket privado `property-images` está preparado en la migración inicial; las policies de objetos esperan a las tablas de propiedades/asignaciones para validar acceso con precisión.

La ubicación física de Storage se versionará por propiedad, por ejemplo `{property_id}/{image_id}.{ext}`. Las operaciones de carga, orden y eliminación deben coordinarse con las filas `property_images`; al borrar o archivar se conservará la integridad y la política de retención decidida para el sistema.

## Herramientas de clientes

- La migración `202611240014_customer_favorites.sql` crea `favorites` con PK compuesta (`user_id`, `property_id`) y fecha; evita duplicados. RLS limita lectura/alta/baja al propio Cliente activo y comprueba que la propiedad sea visible bajo RLS. El usuario confirma el flujo; 0014 se considera aplicada por su reporte, sin verificación remota directa.
- `202611240015_favorite_lists.sql` crea `favorite_lists` (nombre único por dueño, marcas de creación/actualización) y `favorite_list_properties` (PK compuesta y orden por fecha). Cascadas eliminan items al borrar lista o inmueble. RLS limita administración al Cliente activo propietario y solo permite agregar propiedades visibles ya guardadas por ese Cliente en `favorites`. El usuario confirma que las listas funcionan; 0015 se considera aplicada según su reporte.
- La comparación no tiene tabla: almacena IDs de propiedades seleccionadas en `localStorage` del navegador, con máximo cuatro; al mostrar la comparación se vuelven a consultar propiedades visibles bajo las reglas públicas vigentes.
- Las listas no son un rol ni entidad pública; solo su dueño activo puede consultarlas o modificarlas.
- `202611240016_customer_activity.sql` implementa `user_activity` con tipos permitidos (`property_viewed`, `favorite_added`, `favorite_removed`, `inquiry_sent`), property ID nullable y fecha UTC. RLS concede lectura al propio Cliente activo; la escritura pasa por `record_customer_activity`, RPC SECURITY DEFINER que valida propiedad visible, cliente y, en eventos específicos, la existencia de favorito/lead. Deduplica vista de ficha por día y mantiene máximo 500 eventos por usuario. El usuario confirma que el historial funciona; 0016 se considera validada según su reporte.
- `202611240017_in_app_notifications.sql` implementa `notifications` con tipos fijos para suscripción activada/cancelada y cambio de etapa CRM. Triggers insertan avisos al Cliente en la misma transacción del cambio. RLS limita SELECT y UPDATE de `read_at` al titular activo; no hay INSERT directo. El usuario confirma funcionamiento, sin inspección remota.

## Visitas y agenda

- La migración `202611250024_property_visits.sql` crea `visit_requests` y `visit_request_history`. La solicitud requiere Cliente autenticado y guarda nombre/correo del perfil, propiedad, horario propuesto de una hora, mensaje opcional, agente asignado activo (si lo hay), estado y timestamps. La migración `202611250026_agent_visit_assignment_access.sql` hace que agentes activos lean y gestionen visitas según su asignación vigente a la propiedad, aunque esta se haya creado después de la solicitud; revocar la asignación retira el acceso.
- El cliente propone una fecha en su zona local; el navegador la normaliza a UTC. El agente asignado o Admin confirma, rechaza, reprograma, cancela o registra resultado. El cliente consulta su agenda e historial y puede cancelar antes del inicio.
- Las escrituras pasan por `request_property_visit`, `change_property_visit` y `cancel_own_property_visit`; el usuario no puede actualizar directamente estados o actores. El trigger registra estado y horario anterior/nuevo.
- Las políticas RLS dejan leer al Cliente propietario, al Agente activo asignado y a Admin activo. Una advisory lock serializa escritura/confirmación y la RPC rechaza cruces horarios para la misma propiedad o agente.
- El usuario reporta 0024 aplicada en Supabase; esta sesión no inspeccionó su historial. La migración 0025 está en el repositorio y debe aplicarse para normalizar las doce propiedades. No hay selector de espacios libres publicado: el cliente propone horario y el equipo confirma disponibilidad.

Los conflictos de horario se deben evitar en una transacción con restricción de exclusión PostgreSQL para el agente y periodo (requiere `btree_gist`) o una rutina SQL atómica; no depender de una comprobación solo en navegador.

## CRM

- `202611240013_crm_leads.sql` implementa `leads`, `lead_interactions` y `lead_stage_history`. `submit_property_inquiry` valida una propiedad aprobada/disponible y consentimiento, normaliza contacto, limita tres consultas por correo/propiedad en una hora y asigna al primer agente activo asignado a la propiedad. Si no hay agente, el lead queda visible solo para Admin.
- La consulta pública guarda nombre, correo, mensaje, propiedad y marca temporal de consentimiento; no almacena IP ni acepta datos enviados para asignar rol/etapa/agente. No hay escritura directa de visitante sobre leads.
- Admin y agente activo asignado pueden consultar lead e interacciones; solo Admin cambia a quién se asigna desde el ciclo de propiedades (las reasignaciones manuales del CRM no están incluidas). Agente asignado y Admin actualizan etapa; el trigger deja historial. Las notas se escriben como interacciones internas, con actor de sesión. Cliente no tiene acceso a tablas CRM.
- `/admin/leads` y `/agente/leads` muestran hasta 100 leads recientes en columnas por etapa. El usuario confirma que CRM funciona; la sesión no inspeccionó el historial remoto.

## Suscripciones y pago ficticio

- `subscription_plans`: UUID, nombre, precio simulado/moneda, duración, beneficios estructurados, activo y vigencia del precio.
- `subscriptions`: UUID, cliente, plan, estado (`pending|active|expired|cancelled`), inicio, expiración y fechas. El premium actual se deriva de una fila vigente activa; no se almacena como rol.
- `payment_simulations`: UUID, suscripción, resultado ficticio (`succeeded|declined`), importe simulado, referencia de prueba, fecha y datos no financieros. Nunca guardar tarjeta, CVV ni credenciales bancarias.

### Fase 8 — migraciones 0006 y 0007

`202611230006_premium_subscriptions.sql` materializa estas tres tablas con grants y RLS. El usuario reporta haberla aplicado. La función `private.has_active_premium_membership()` deriva el acceso Premium del rol Cliente activo más una suscripción activa dentro de su periodo. La RPC `public.simulate_premium_checkout` registra resultado, periodo, referencia ficticia y auditoría en una transacción; no acepta ni conserva información bancaria. La migración amplía RLS para propiedades aprobadas Premium, metadata de imágenes/características y Storage.

`202611230007_premium_cancel.sql` añade `cancel_own_premium_subscription` para el Cliente titular y `admin_cancel_premium_subscription` para Admin. Ambas son `SECURITY DEFINER`, serializan por usuario, no conceden UPDATE directo sobre `subscriptions` y registran auditoría. No hay reembolsos ni datos bancarios. El usuario confirma que el flujo completo funciona; la aplicación remota no se inspeccionó directamente desde esta sesión.

## Analítica y administración

- `analytics_events`: UUID, evento permitido, propiedad opcional, usuario pseudónimo opcional, sesión efímera/deduplicación acotada, metadatos permitidos y fecha. Definir retención y minimización antes de capturar.
- `property_views`: entidad de agregado por propiedad y periodo o evento deduplicado; materialización/actualización mediante operación protegida, no contador manipulable por el cliente.
- Incremento inicial de Fase 9: `/admin` consulta conteos exactos de `properties`, `profiles`, `subscription_plans`, `subscriptions` y `payment_simulations` bajo sesión Admin/RLS; agrupa `properties.created_at` por mes, estados reales por categoría, simulaciones por semana y cambios recientes desde `property_price_history`. No introduce tablas ni guarda eventos; las simulaciones nunca se presentan como ingresos.
- `site_settings` (migración 0018): fila singleton con nombre, frase, descripción SEO y contacto público, actor y fecha. Lectura pública de esa fila; INSERT/UPDATE requieren Admin activo y `updated_by = auth.uid()`. La aplicación valida campos con Zod; la base restringe longitudes y mantiene `updated_at` mediante trigger.

El formulario guarda esta fila con `upsert` usando `singleton` como clave de conflicto, pero omite `singleton` del payload para que PostgreSQL use su default `true`. La migración no otorga UPDATE sobre esa clave fija; incluirla en el payload puede hacer que el upsert requiera un grant que el diseño no concede.
- `audit_logs`: UUID, actor, acción, tipo/ID entidad, valores antes/después permitidos, correlación y fecha; solo inserción para servicios autorizados, lectura de admin.
- `property_reports`: UUID, propiedad, reportante, motivo, detalle limitado, estado, resolutor y fechas.
- `notifications`: UUID, destinatario, tipo, referencia, leído/fecha; cada usuario solo consulta y actualiza sus notificaciones.

### Vistas de ficha — migración 0008 preparada

`202611240008_property_view_analytics.sql` añade `property_view_events`: propiedad, UUID aleatorio por sesión de pestaña, fecha UTC e instante. Un índice único deduplica por propiedad/sesión/día. La tabla no concede lectura directa a `anon` ni `authenticated`; `record_public_property_view` registra solo publicaciones aprobadas visibles al visitante o al miembro Premium actual, serializa el límite de 30 fichas por sesión/día y elimina oportunistamente registros con más de 90 días. `admin_property_view_daily_counts` limita el rango a 90 días, exige Admin activo y devuelve únicamente conteos por fecha. El usuario confirma que el tracking y la gráfica funcionan en su entorno; las pruebas negativas detalladas siguen pendientes.

El usuario confirma que el tracking, la gráfica, el ranking, el filtro y el CSV funcionan en su entorno. La migración `202611240009_property_view_ranking.sql` añade `admin_property_view_top_properties`: acepta intervalo de hasta 90 días y límite de 1–20, exige Admin activo y devuelve título/slug y conteo agregado de hasta 20 propiedades, nunca IDs de sesión ni eventos individuales.

La migración `202611240010_property_view_breakdowns.sql` añade `admin_property_view_breakdowns`, que exige Admin activo y devuelve vistas agrupadas por tipo y las 10 ciudades principales para rangos de hasta 90 días. El usuario confirma que los desgloses y el CSV funcionan; esta confirmación se registra como validación funcional de 0010, aunque no se consultó el historial remoto desde esta sesión.

### Agentes — migración 0011 preparada

`202611240011_agent_profiles.sql` crea `public.agents`, relacionada 1:1 con `profiles`, con slug, nombre público, biografía, especialidades, zonas de servicio y bandera de publicación. La lectura pública se limita a perfiles publicados vinculados a cuentas activas con rol `agent`; un agente solo puede leer su propia fila y Admin activo puede gestionar perfiles de cuentas Agente. El usuario confirma que los perfiles funcionan en su entorno tras aplicar 0011; no se inspeccionó directamente el historial remoto.

El segundo incremento de Fase 10 usa `agent_assignments` de 0003. La revisión detectó que 0003 había creado la policy de lectura propia, pero no concedió el privilegio SQL `SELECT`; además, esa policy no excluía cuentas suspendidas. `202611240012_agent_assignment_read.sql` concede `SELECT` sujeto a RLS y reemplaza la policy para exigir agente activo. Admin inserta una asignación con `assigned_by` de la sesión, y al retirarla se escribe `revoked_at` para conservar historial. El usuario confirma que asignaciones y cartera funcionan tras aplicar 0012. El agente consulta solo sus asignaciones vigentes y las propiedades permitidas por RLS; el panel no habilita escrituras del agente sobre la ficha.

La auditoría de Fase 14 detectó que la policy administrativa `FOR ALL` aún permitía editar campos de autoría y borrar físicamente una asignación. La migración `202611240019_agent_assignment_history_guard.sql` reemplaza esa policy por SELECT/INSERT/UPDATE separados, concede `INSERT` solo para propiedad/agente/actor y `UPDATE` solo para `revoked_at`, exige `assigned_by = auth.uid()` y elimina el privilegio DELETE. El usuario confirma el flujo; no se verificó remotamente ni se ejecutó la matriz SQL independiente.

La migración `202611240020_agent_assignment_audit.sql` agrega un trigger que guarda en `audit_logs` las altas y revocaciones, con actor y referencias, dentro de la misma transacción de asignación. El usuario confirma el flujo; no se inspeccionó la base remota ni se ejecutaron pruebas SQL independientes.

La migración `202611240021_private_property_details.sql` traslada las columnas sensibles desde `properties` a `property_private_details`, redondea coordenadas públicas, reduce SELECT a columnas explícitas y excluye los IDs de actor y timestamps internos de grants legibles. La búsqueda geoespacial ahora retorna solo UUIDs elegibles y el catálogo resuelve detalles públicos bajo sus columnas/grants. Pendiente de aplicar; requiere verificar listados, mapa y acceso privado bajo roles distintos.

## Relaciones principales

```text
auth.users 1—1 profiles 1—0..1 agents
profiles 1—N properties (creador)       agents N—N properties (agent_assignments)
properties 1—N images / price_history / feature_values / visit_requests
profiles N—N properties (favorites)      favorite_lists 1—N list_properties
profiles 1—N subscriptions 1—N payment_simulations
agents 1—N leads 1—N interactions / notes / stage_history
profiles 1—N visit_requests (cliente)     agents 1—N availability
profiles 1—N audit_logs / notifications / user_activity
```

## Integridad, índices y operaciones atómicas

Índices previstos: propiedades por (`publication_status`, `status`, `visibility`, fecha); slug único; precio; ciudad/tipo; ubicación GiST; asignaciones por agente; favoritos por usuario; visitas por agente e inicio/estado; leads por agente/etapa/actualización; suscripciones por usuario/estado/expiración; eventos por tipo/fecha y propiedad. Añadir índices desde patrones observados, no indiscriminadamente.

Un trigger o RPC transaccional registrará `property_price_history` al cambiar `price`; el cliente no podrá insertar/editar ese historial directamente. Igual para cambios de etapa/estado auditables. La implementación deberá definir restauración de borrados, retención y borrado de cuenta compatible con restricciones legales/académicas.

## PostGIS — migración preparada en Fase 7

La migración `202611230005_geospatial_search.sql` agrega `properties.location` como `extensions.geography(Point,4326)`, la sincroniza desde las columnas latitud/longitud y crea índice GiST. También prepara RPC `search_public_properties_nearby` con `SECURITY INVOKER`, RLS, estados/visibilidad públicas y límites de radio/resultados.

El usuario reporta haber habilitado PostGIS desde Database → Extensions en Supabase, en el esquema `extensions`. Confirmó en SQL Editor la firma de la RPC de 0005. Una llamada anónima a `/rest/v1/rpc/search_public_properties_nearby` y la lectura posterior de la fila con selección pública respondieron HTTP 200. La ruta de mapa en producción con centro CDMX y radio 5 km también respondió HTTP 200 y renderizó una propiedad. El usuario confirma que el mapa funciona; la interacción de toque/gestos no se observó de forma independiente. El `PGRST125` de un sondeo anterior no se reprodujo con la ruta canónica; la causa inicial no quedó identificada. La búsqueda por área poligonal vendrá después; esta primera consulta usa radio geodésico. No se deben exponer direcciones exactas cuando la publicación requiera privacidad.

## Correo de consultas

El usuario reporta 0022 aplicada; no se ha verificado el estado remoto. La migración 0023 retira el trigger y las funciones de cola que ya no se usan. La tabla de cola permanece como archivo de posibles registros previos y no recibe nuevas filas. Los leads y sus relaciones no cambian.
