# API y casos de uso propuestos

**Estado:** contrato conceptual para el proyecto; el endpoint de analítica indicado abajo ya está implementado. Se priorizan Server Actions para mutaciones invocadas desde la interfaz Next.js y Route Handlers para operaciones HTTP explícitas. No duplicar la misma operación en varios transportes.

## Servicios de dominio previstos

- `properties`: búsqueda paginada con filtros ordenables permitidos, detalle público por slug, creación/edición, revisión, publicación y cambio de precio.
- `setFavoriteAction`: añadir/eliminar idempotente un favorito propio; exige sesión de Cliente activo y Zod en servidor. El usuario confirma que favoritos funcionan; 0014 se considera validada por su reporte.
- `/favoritos`: consulta los favoritos propios y los resuelve contra propiedades legibles por el usuario.
- `/comparar`: compara hasta cuatro propiedades elegidas por el usuario; los IDs viven en `localStorage` y el servidor solo entrega las fichas que siguen visibles.
- `manageFavoriteListAction`: crear, renombrar o borrar lista del Cliente autenticado; `setFavoriteListPropertyAction` agrega/quita propiedades favoritas con Zod, autorización server-side y RLS. El usuario confirma que funcionan; 0015 se considera validada según su reporte.
- `/favoritos/listas` y `/favoritos/listas/[id]`: muestran y administran listas propias y sus propiedades visibles.
- `record_customer_activity(activity_type, property_id)`: RPC autenticada para registrar eventos permitidos del Cliente activo; deduplica vistas por día. Se llama desde el servidor tras la consulta de una ficha, alta/baja de favorito y envío de consulta.
- `/mi-actividad`: presenta los últimos eventos propios y enlaza las propiedades que siguen visibles; el usuario confirma que el flujo funciona y 0016 se considera validada según su reporte.
- `/notificaciones`: lista avisos propios de Premium y consultas CRM; `markNotificationReadAction` y `markAllNotificationsReadAction` actualizan solo el campo de lectura. El usuario confirma funcionamiento de 0017.
- Solicitudes de visita aún no tienen contrato implementado.
- `visits`: solicitar, cancelar, aceptar/rechazar y proponer horario con verificación transaccional de disponibilidad.
- `subscriptions`: consultar planes, iniciar simulación de pago y procesar resultado ficticio en servidor.
- `agents`: `saveAgentProfileAction` crea/actualiza un perfil de agente existente solo para Admin activo; `assignPropertyToAgentAction` y `revokePropertyAssignmentAction` gestionan asignaciones desde Admin; `/agente` lista cartera activa del titular mediante sesión/RLS; `/agentes` y `/agentes/[slug]` presentan perfiles publicados de cuentas Agente activas.
- `submit_property_inquiry(target_property_id, sender_name, sender_email, inquiry_message, privacy_consent)`: RPC pública que valida propiedad disponible y consentimiento, limita frecuencia y asigna al agente activo de la propiedad; no acepta estados ni identificadores de agente desde el navegador.
- `updateLeadStageAction` y `addLeadNoteAction`: acciones para Admin o Agente; RLS limita lead asignado, la etapa se registra en historial y las notas son internas. Vistas en `/admin/leads` y `/agente/leads`.
- `analytics`: recibir eventos de una lista permitida con deduplicación y límite de frecuencia; exponer métricas agregadas autorizadas.
- `/admin/configuracion`: `saveSiteSettingsAction` exige Admin activo, valida nombre/frase/descripción/contacto con Zod y persiste singleton con actor de sesión. `site_settings` es lectura pública por diseño y escritura RLS de Admin activo; campos de contacto opcionales.
- `GET /sitemap.xml` produce rutas públicas estáticas más propiedades y agentes publicados visibles; `GET /robots.txt` declara sitemap y rutas privadas excluidas. `NEXT_PUBLIC_SITE_URL` aporta el origen canónico.

## Límites de contrato

- Toda entrada se valida en servidor con esquema Zod; los campos aceptados se definen por caso de uso y no se persisten objetos arbitrarios.
- Filtros, orden y tamaño de página están en lista permitida; paginación con cursor preferible para listados grandes.
- Respuesta tipada con datos mínimos; errores consistentes (`unauthorized`, `forbidden`, `not_found`, `validation_error`, `conflict`, `rate_limited`, `internal_error`) sin detalles internos.
- Los casos de uso mutables repiten autorización por recurso y dependen de RLS. Acciones destructivas incluyen confirmación de producto y registro de auditoría.
- Los webhooks externos no se requieren para pago simulado; no declarar ni aceptar callbacks de pasarelas reales.

Los nombres, rutas y payloads definitivos se documentarán al implementar Fases 4–14. Se añadirá contrato OpenAPI solo si existe una API HTTP consumida por clientes externos.

## Privacidad de propiedades (Fase 14)

La migración 0021 limita los SELECT directos de `properties`, `property_images` e historial de precio a columnas explícitas. Dirección, código postal y coordenadas exactas residen en `property_private_details`; su RLS exige Admin activo o agente activo asignado y los grants solo exponen los campos que el panel necesita. La RPC pública `search_public_properties_nearby` devuelve IDs elegibles, y el catálogo obtiene después las fichas bajo RLS con latitud/longitud redondeadas. Aplicación y validación por roles siguen pendientes.

## Endpoint implementado — vistas de ficha

`POST /api/analytics/property-view` acepta únicamente `{ propertyId, sessionId }` como UUID, con media type JSON y `Origin` igual al origen configurado por `NEXT_PUBLIC_SITE_URL`. El `sessionId` aleatorio se conserva en `sessionStorage` de la pestaña; la base registra una vista por ficha/sesión/día UTC, limita cada sesión a 30 fichas/día y elimina eventos con más de 90 días. No se guardan IP, usuario, navegador, referente ni URL. La ficha se valida de nuevo en SQL contra publicación y visibilidad. Respuesta `204` cuando se procesa, `400` para entrada inválida, `403` para origen no permitido y `503` si Supabase/RPC falla. El ID de sesión lo elige el llamante; este contador no sustituye una mitigación anti-abuso. El dashboard usa `admin_property_view_daily_counts`, que devuelve solo agregados y exige Admin activo.

`admin_property_view_top_properties(range_start, range_end, result_limit)` (migración 0009) devuelve las propiedades con más vistas en el intervalo, limita el rango a 90 días y el resultado a 20, y exige Admin activo.

`admin_property_view_breakdowns(range_start, range_end)` (migración 0010) devuelve agregados por tipo de inmueble y hasta 10 ciudades, para un rango máximo de 90 días y solo con Admin activo.

`GET /api/admin/analytics/export?views=28` descarga CSV UTF-8 con una fila por día, top 10 de fichas y desgloses por tipo/ciudad. `views` acepta 7, 28 o 90 (default 28; otro valor usa 28); el mismo parámetro filtra las gráficas en `/admin`. Devuelve `401` sin una sesión reconocida, `403` para perfiles que no son Admin activo y `503` ante fallo de Supabase; marca el archivo como privado/no cacheable. Solo exporta RPC agregadas, nunca UUIDs de sesión ni eventos crudos. Los campos textuales se neutralizan ante prefijos de fórmula de hojas de cálculo.
