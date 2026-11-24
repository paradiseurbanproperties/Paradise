# Changelog

Los cambios relevantes del proyecto se registran aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado semántico cuando exista software ejecutable.

## [0.17.13] — 2026-11-24

### Despliegue
- GitHub confirma que Vercel completó el deployment asociado al commit `a18bc63`.
- Confirmado en código y build que existe la ruta pública `/`; documentados `Production Branch: main`, `Root Directory: ./` y `Output Directory` predeterminado para Next.js.
- Sigue pendiente ver la URL exacta/código del 404 reportado para distinguir configuración del proyecto, dominio/preview o protección del deployment.

## [0.17.12] — 2026-11-24

### Entrega
- Preparación de Vercel: documentados build, variables por ambiente y callbacks de Supabase Auth; no se añade configuración innecesaria porque Next.js se detecta automáticamente.
- Repositorio remoto confirmado: `paradiseurbanproperties/Paradise`, vacío, rama `main`, permiso de escritura disponible.
- `.env.local`, dependencias, `.vercel` y artefactos Next están excluidos del commit por `.gitignore`.
- `pnpm build` fija Webpack para evitar la dependencia del puerto interno de Turbopack en el entorno; la build completa con rutas estáticas/dinámicas generó correctamente. `pnpm lint` y `pnpm typecheck` también pasan.

## [0.17.11] — 2026-11-24

### Marca y metadatos
- El icono entregado en `PARADISE.png` se sirve como `public/icons/paradise.png`, icono de pestaña y Apple touch icon.
- El icono se usa como imagen Open Graph y tarjeta Twitter para vistas previas al compartir.
- `pnpm lint` y `pnpm typecheck` pasan; el archivo publicado conserva formato PNG RGBA de 435×458.

### Diagnóstico móvil
- La captura móvil muestra inertes menú/tema/perfil y un mapa en carga; los síntomas sugieren fallo general de JavaScript cliente/hidratación.
- No se pudo inspeccionar consola ni peticiones en `192.168.1.65`: no hay servidor activo ni acceso remoto al teléfono. No se afirma que las interacciones móviles estén resueltas.

## [0.17.10] — 2026-11-24

### Interfaz y accesibilidad
- El mapa permite arrastrar con un dedo y acercar con pellizco en pantallas táctiles; sus controles y marcadores tienen áreas de interacción mayores.
- Botón hamburguesa, selector de tema y perfil usan zonas táctiles de 48 CSS px; tienen estado de pulsación y respuesta visual al abrir.
- Paleta de claro/oscuro más neutra, con texto y superficies separados; selección y badges usan color frontal con contraste adecuado.
- Añadida una indicación breve de gestos táctiles en el mapa.

### Verificado
- Revisión estática encontró que `cooperativeGestures: true` exigía dos dedos para usar el mapa móvil; se corrigió según la opción documentada por MapLibre.
- Contraste calculado: texto principal 17.24:1 en claro y 17.04:1 en oscuro; texto secundario 6.11:1 y 9.52:1; bordes 3.35:1 y 3.09:1 en sus superficies.
- `pnpm lint`, `pnpm typecheck` y parseo PostCSS de tokens/componentes/base pasan. `git diff --check` devolvió 0, aunque el repositorio tiene sus archivos sin seguimiento y ese comando no verificó su contenido.
- Falta probar interacción en iPhone/Safari y Android; no se tuvo acceso al navegador/dispositivo en esta sesión.

## [0.17.9] — 2026-11-24

### Interfaz
- Barra superior centrada con Inicio, Propiedades, Comparar y Agentes; Mi cuenta, Premium y accesos por rol pasan al menú del perfil.
- Menús táctiles responsivos; cierre con Escape, click exterior o al completar navegación; rutas con prefetch e indicador de transición.
- El header deja de esperar consultas de Premium y notificaciones en cada render. Se consultan al abrir el menú, sin retrasar el cambio de página.
- Render queda documentado como opción gratuita para demo, con el comportamiento de suspensión y arranque en frío.

### Confirmado por el usuario
- El usuario reporta que el enlace de verificación de correo funciona y que 0021 parece funcionar; no se verificó Supabase remoto.

### Verificado
- `pnpm lint`, `pnpm typecheck`, parseo PostCSS y `git diff --check` pasan. No se pudo acceder al navegador local para revisión visual/interactiva.

### Pendiente
- Revisar visual y funcionalmente el header en escritorio y móviles.

## [0.17.8] — 2026-11-24

### Seguridad
- Migración 0021 separa dirección, código postal, coordenadas exactas y actores de gestión de la fila pública de propiedades.
- La API concede solo columnas necesarias y excluye ubicación PostGIS, uploader y autor de cambios de precio. En la tabla privada, aun Admin y agente asignado solo leen las columnas de dirección y coordenadas que necesita el panel; IDs de actores y timestamps quedan fuera de grants. El mapa/búsqueda pública usa coordenadas redondeadas y la RPC geoespacial retorna solo IDs.
- El panel Admin carga los detalles privados bajo RLS y conserva la edición exacta; la ficha pública informa que su marcador es aproximado.

### Confirmado por el usuario
- El usuario confirma que la migración 0020 y la auditoría de asignaciones funcionan, sin inspección remota directa.

### Verificado
- `pnpm lint` y `pnpm typecheck` pasan. No se ejecutaron pruebas SQL ni de producto.

### Pendiente
- Aplicar 0021 y probar acceso a datos privados con cuentas anon/Cliente/Agente asignado/no asignado/Admin.

## [0.17.7] — 2026-11-24

### Seguridad
- Migración 0020 agrega auditoría transaccional de creación y revocación de asignaciones de agente en `audit_logs`.

### Confirmado por el usuario
- 0020 y su flujo de auditoría quedan funcionales según reporte; la verificación SQL independiente sigue pendiente.
- La revisión independiente de permisos y mitigación anti-abuso sigue en curso.

## [0.17.6] — 2026-11-24

### Seguridad
- El endpoint `POST /api/analytics/property-view` compara `Origin` contra `NEXT_PUBLIC_SITE_URL` en vez de confiar en el host de la petición.
- La ruta valida exactamente el media type `application/json`, aceptando parámetros como `charset`.
- La configuración de Next envía cabeceras base para MIME sniffing, framing, referente y permisos de dispositivos.

### Confirmado por el usuario
- El usuario confirma que asignar y revocar funciona tras 0019; no se inspeccionó el historial remoto.

### Verificado
- Revisión estática de rutas y RPC; la telemetría no guarda IP ni identidad. El ID de sesión sigue siendo controlable por el llamante, así que no evita fraude.
- `pnpm lint` y `pnpm typecheck` pasan. No se ejecutaron pruebas de producto ni SQL.

### Pendiente
- Aplicar la matriz RLS negativa en varias identidades y configurar una mitigación anti-abuso para consultas públicas.

## [0.17.5] — 2026-11-24

### Seguridad
- Migración 0019 separa las políticas administrativas de `agent_assignments`, restringe INSERT/UPDATE a campos necesarios, exige autoría de sesión y deshabilita el borrado directo para conservar el historial.

### Confirmado por el usuario
- El usuario confirma que configuración y SEO funcionan; 0018 queda validada según su reporte, sin inspección remota directa.

### Verificado
- La revisión estática identificó el exceso de permisos; `pnpm lint` y `pnpm typecheck` pasan. No se ejecutaron pruebas SQL ni se consultó Supabase remoto.

### Pendiente
- Ejecutar pruebas negativas independientes de permisos tras la confirmación funcional del usuario.

## [0.17.4] — 2026-11-24

### Añadido
- SEO técnico con metadatos raíz dinámicos, canonical, sitemap público, `robots.txt` y `noindex` en rutas privadas.
- `/admin/configuracion` para identidad, descripción SEO y contacto, con migración singleton 0018, validación de entrada y RLS de escritura Admin.
- El pie público muestra frase y contacto solo cuando esos valores se configuran.

### Corregido
- La ruta `/propiedades/mapa` se movió desde una carpeta literal con paréntesis al grupo `(public)` real de App Router.

### Confirmado por el usuario
- El usuario confirma que las notificaciones in-app funcionan; 0017 se considera validada según su reporte, sin inspección remota directa.
- El usuario confirma que 0018, configuración y experiencia SEO funcionan; no se inspeccionó el historial de migraciones remoto.

### Verificado
- `pnpm lint` y `pnpm typecheck` pasan. No se ejecutaron pruebas de producto ni se consultó Supabase remoto.

## [0.17.3] — 2026-11-24

### Añadido
- Notificaciones in-app para activación/cancelación Premium y cambios de etapa CRM en `/notificaciones`.
- Marcado individual o global como leído y contador de no leídas en la navegación del Cliente.
- Migración 0017 con inserción por triggers transaccionales y RLS propia; solo `read_at` puede actualizarse desde la sesión.

### Confirmado por el usuario
- La Fase 11 funciona, incluido el historial de actividad; 0014–0016 se consideran validadas según su reporte, sin inspección remota directa.

### Verificado
- `pnpm lint` y `pnpm typecheck` pasan. No se ejecutaron pruebas de producto ni se aplicó 0017 desde esta sesión.

### Pendiente
- Aplicar `202611240017_in_app_notifications.sql` en Supabase y probar eventos, permisos y contador.

## [0.17.2] — 2026-11-24

### Añadido
- Historial privado `/mi-actividad` para vistas de ficha, alta/baja de favoritos y consultas enviadas.
- Migración 0016 con RLS de lectura propia, RPC de escritura validada, deduplicación diaria de vistas y retención acotada a 500 entradas.
- Navegación de Cliente enlaza a Actividad.

### Confirmado por el usuario
- Listas personales y herramientas previas funcionan; 0015 se considera validada por su reporte, sin inspección directa del estado remoto.

### Verificado
- `pnpm lint`, `pnpm typecheck`, parseo PostCSS y `git diff --check` pasan. No se ejecutaron pruebas de producto.

### Pendiente
- Aplicar `202611240016_customer_activity.sql` en Supabase y validar eventos, privacidad, límites y permisos.

## [0.17.1] — 2026-11-24

### Añadido
- Listas personales en `/favoritos/listas` y detalle por lista: crear, renombrar, eliminar, añadir favoritos y retirarlos.
- Migración 0015 para listas privadas e items, con RLS por Cliente activo propietario y restricción a propiedades visibles que ya sean favoritos.

### Confirmado por el usuario
- Favoritos y comparación funcionan; 0014 se considera validada según su reporte, sin consulta directa del estado remoto.

### Verificado
- `pnpm lint` y `pnpm typecheck` pasan. No se ejecutaron pruebas de producto ni se aplicó 0015 desde esta sesión.

### Pendiente
- Aplicar `202611240015_favorite_lists.sql` en Supabase y probar aislamiento y operaciones CRUD con dos Clientes.

## [0.17.0] — 2026-11-24

### Añadido
- Herramientas de cliente: favoritos persistentes por cuenta en `/favoritos`, controles en fichas/catálogo y comparación local de hasta cuatro propiedades en `/comparar`, con limpieza de IDs que ya no correspondan a fichas visibles.
- Migración 0014 con RLS de favoritos por Cliente activo y propietario.

### Confirmado por el usuario
- El CRM de Fase 10 funciona; 0013 se considera funcional según su reporte, aunque el historial remoto no fue inspeccionado en esta sesión.

### Verificado
- `pnpm lint`, `pnpm typecheck`, parseo PostCSS de `src/styles/components.css` y `git diff --check` pasan.
- No se ejecutaron pruebas de producto ni se consultó Supabase remoto.

### Confirmado por el usuario
- Favoritos y comparación funcionan; 0014 queda validada por su reporte, sin inspección directa del historial remoto.

### Confirmado por el usuario
- Las listas personales funcionan; 0015 se considera validada según su reporte, sin inspección directa del historial remoto.

### Pendiente
- Visitas de clientes quedan pendientes.

## [0.16.9] — 2026-11-24

### Añadido
- Formulario de consulta en fichas reales disponibles, con consentimiento, validación servidor y honeypot.
- CRM Kanban en `/admin/leads` y `/agente/leads`, con etapas, historial automático y notas internas.
- Migración 0013 para leads, interacciones, historial de etapas, RLS, enrutamiento a agentes activos y límite de tres consultas por correo/propiedad por hora.

### Verificado
- `pnpm lint`, `pnpm typecheck`, parseo CSS y `git diff --check` pasan.

### Confirmado por el usuario
- El CRM funciona; 0013 queda funcionalmente confirmado por su reporte. No se inspeccionó el historial remoto.

## [0.16.8] — 2026-11-24

### Añadido
- Dashboard `/agente` con cartera y estados calculados desde asignaciones activas propias.
- Administración de asignaciones en `/admin/agentes`; la retirada marca `revoked_at` y conserva el historial existente.
- Enlace “Mi cartera” en navegación para cuentas Agente.
- Migración 0012 concede `SELECT` a `agent_assignments` bajo RLS y bloquea lectura directa de agentes suspendidos; 0003 tenía policy sin grant correspondiente.

### Confirmado por el usuario
- La cartera y las asignaciones funcionan tras aplicar 0012.

### Verificado
- `pnpm lint`, `pnpm typecheck`, parseo CSS y `git diff --check` pasan.

### Pendiente
- La prueba independiente con cada rol permanece para la matriz global de Fase 14.

## [0.16.7] — 2026-11-24

### Añadido
- `/admin/agentes` para administrar perfiles profesionales de cuentas existentes con rol Agente.
- Directorio público `/agentes` y perfil individual `/agentes/[slug]`, sin contacto personal ni perfiles ficticios.
- Migración 0011 con tabla `agents`, políticas RLS de publicación/lectura propia y helper para comprobar cuenta Agente activa.

### Confirmado por el usuario
- Los desgloses por tipo/ciudad y el CSV de Fase 9 funcionan; Fase 9 queda validada funcionalmente.
- Los perfiles de agente funcionan tras aplicar la migración 0011 en su entorno.

### Verificado
- `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan.

### Pendiente
- Probar el nuevo dashboard y la gestión de asignaciones de propiedades en el incremento 0.16.8.

## [0.16.6] — 2026-11-24

### Añadido
- Gráficas de vistas por tipo de inmueble y ciudad; aplican el mismo rango de 7/28/90 días del panel.
- El CSV incorpora filas agregadas de ambos desgloses.
- Migración 0010 con RPC Admin, periodo limitado a 90 días y top 10 ciudades.

### Confirmado por el usuario
- El selector de periodo y la descarga CSV funcionan.

### Verificado
- `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan.

### Confirmado por el usuario
- Los desgloses y CSV funcionan; el estado remoto no se inspeccionó directamente desde esta sesión.

## [0.16.5] — 2026-11-24

### Añadido
- Selector de periodo de vistas para 7, 28 o 90 días; actualiza a la vez la serie diaria, el top de fichas y el CSV.
- Normalizador común de periodos: valores no admitidos usan 28 días por defecto; máximo permitido 90.

### Confirmado por el usuario
- La descarga CSV del incremento anterior funciona.

### Verificado
- `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan.

### Pendiente
- Revisión visual del selector y contraste de panel/CSV en cada periodo.

## [0.16.4] — 2026-11-24

### Añadido
- Descarga CSV privada desde `/admin` con la serie diaria de 28 días y el top 10 de fichas más vistas.
- Exportación con UTF-8, filas de día sin vistas, control de sesión/rol Admin, consultas agregadas y neutralización de texto que pueda interpretarse como fórmula.

### Confirmado por el usuario
- Tracking, gráfica diaria y ranking funcionan después de 0008–0009.

### Verificado
- `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan.

### Pendiente
- Descargar como Admin y comparar valores con el panel; comprobar rechazo de Cliente/visitante.

## [0.16.3] — 2026-11-24

### Añadido
- Ranking de las diez fichas más vistas en los últimos 28 días, con barras proporcionales y enlaces directos.
- RPC agregada que exige Admin activo, restringe el periodo a 90 días y limita el resultado a 20 fichas.

### Verificado
- `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan.

### Confirmado por el usuario
- El tracking de vistas y la gráfica diaria funcionan en su entorno después de la migración 0008.

### Pendiente
- Aplicar `supabase/migrations/202611240009_property_view_ranking.sql` y revisar el ranking con publicaciones/datos reales.

## [0.16.2] — 2026-11-24

### Añadido
- Tracking de vistas de fichas reales con sesión aleatoria limitada a la pestaña, deduplicación por ficha/día y límite de 30 fichas por sesión al día.
- Migración 0008 con conteo diario protegido para Admin, validación SQL de publicación/visibilidad y limpieza de retención de 90 días.
- Gráfica diaria de vistas de los últimos 28 días en `/admin`.

### Privacidad y seguridad
- No se persisten IP, usuario, navegador, referente, URL ni búsqueda. La tabla de eventos no ofrece lectura directa por Data API; la gráfica usa una RPC agregada con guardia Admin.
- Las fichas de demostración no envían eventos.

### Pendiente
- Aplicar `supabase/migrations/202611240008_property_view_analytics.sql` en Supabase y probar registro, deduplicación, visibilidad, límite, retención y gráfico con cuentas Cliente/Admin.

### Verificado
- `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan.

### Pendiente
- Revisión visual y contraste de datos reales con Supabase conectado.

## [0.16.1] — 2026-11-24

### Mejorado
- El dashboard ahora prioriza gráficas reales: tendencia mensual de creación de propiedades, distribución por estado de publicación/comercial y simulaciones Premium por semana.
- Se añadió una tabla con cambios de precio recientes desde el historial persistido.
- Las series se ocultan si alguna consulta falla, para no presentar datos incompletos como cero.
- Los indicadores numéricos quedan como resumen secundario.

### Verificado
- `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan.

### Pendiente
- Revisar presentación y datos en `/admin` con sesión Admin conectada a Supabase.

## [0.16.0] — 2026-11-24

### Añadido
- Panel administrativo `/admin` con conteos exactos del inventario, moderación, Clientes, planes Premium, vigencias y simulaciones de los últimos 30 días.
- Acceso directo al panel desde la navegación de Admin y tarjetas responsivas enlazadas a los módulos de origen.
- Indicación explícita de que no se registran vistas ni tráfico, y de que los pagos Premium son simulaciones, no ingresos.

### Corregido
- La ruta `/admin` se movió al route group `(admin)`; su ubicación inicial tenía comillas literales y Next no la reconocía.

### Pendiente
- Verificar visualmente y contrastar conteos con Supabase bajo una cuenta Admin.
- Diseñar una taxonomía de eventos antes de instrumentar navegación.

### Verificado
- Tras corregir la ubicación de la ruta, `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan.

## [0.15.5] — 2026-11-24

### Confirmado por el usuario
- El flujo Premium completo funciona. Se cierra la Fase 8 funcionalmente y se avanza a Fase 9 (Analítica y dashboard).

### Pendiente
- Las pruebas automatizadas y negativas de RLS siguen en el alcance de Fase 14.

## [0.15.4] — 2026-11-24

### Confirmado por el usuario
- Crear planes y simular pagos Premium funciona después de corregir los exports de Server Actions y reiniciar el servidor.

### Pendiente
- Confirmar/aplicar 0007 y probar cancelación y permisos RLS con Cliente/Admin.

## [0.15.3] — 2026-11-24

### Corregido
- Se movieron los estados iniciales de `useActionState` y el tipo de checkout fuera de los módulos con `"use server"`; Next.js solo permite exportar funciones async desde esos módulos.
- Los módulos de acciones de suscripciones ahora exportan exclusivamente acciones asíncronas.
- Se limpió la caché generada `.next` para evitar que Next reutilice un action loader anterior.

### Verificado
- `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan; se inspeccionó que las acciones solo exportan funciones async.

### Pendiente
- Reiniciar `pnpm dev` y volver a probar con el código fuente actualizado; no hay servidor ni navegador local disponible en esta sesión.

## [0.15.2] — 2026-11-24

### Corregido
- Guardar planes ahora confirma que Supabase devolvió la fila insertada/actualizada antes de mostrar éxito.
- Los errores de plan y checkout distinguen permisos de Admin/Cliente, migración/esquema ausente y plan inactivo, con mensajes accionables.
- Las acciones Premium dejaron de invalidar el layout raíz con `revalidatePath("/", "layout")`; ahora revalidan rutas específicas y manejan excepciones sin caer en la pantalla global de error.

### Pendiente
- Reintentar ambas operaciones en el proyecto conectado. El estado remoto de 0006, las policies y la caché de API no se pueden verificar desde esta sesión; la causa de la pantalla genérica aún requiere confirmación local.

## [0.15.1] — 2026-11-23

### Corregido
- La cancelación propia ahora crea una entrada de auditoría por suscripción cancelada y usa el ID de esa suscripción como entidad.

### Pendiente
- Aplicar únicamente la migración 0007 y probar el flujo con las cuentas Cliente y Admin del proyecto Supabase. No hay navegador ni Supabase CLI enlazada en esta sesión.

## [0.15.0] — 2026-11-23

### Añadido
- Historial de suscripciones y pagos de prueba en `/premium`.
- Cancelación de vigencia simulada mediante RPC (`cancel_own_premium_subscription` y `admin_cancel_premium_subscription`) en la migración 0007.
- Panel Admin `/admin/suscripciones` para crear/editar planes y revisar o cancelar suscripciones de prueba.
- Rama de trabajo `fase-8-premium` para el relevo de esta sesión.

### Verificado
- `pnpm lint` y `pnpm typecheck` pasan.
- El usuario reporta que la migración 0006 ya está aplicada en Supabase.

### Pendiente
- Aplicar únicamente `202611230007_premium_cancel.sql` y probar checkout, historial, cancelación, distintivo y panel Admin con cuentas reales.
- La revisión visual en el navegador de este incremento no se ejecutó aquí: no hay servidor de desarrollo disponible en la sesión.

## [0.14.0] — 2026-11-23

### Añadido
- `AGENTS.md` con guía de lectura, límites de fases, reglas de seguridad y estado para relevo por otra IA.
- Migración inicial Fase 8 para planes Premium, suscripciones y pagos simulados, entitlement basado en vigencia y políticas de acceso a publicaciones/fotos exclusivas.
- RPC transaccional `simulate_premium_checkout` con resultados ficticios, sin capturar datos financieros y con auditoría.
- Ruta `/premium` con precios/beneficios de base de datos, simulación explícita de éxito/rechazo y avisos contra datos financieros.
- Distintivo dorado condicionado por servidor en navbar y perfil; lectura de contenido Premium ampliada mediante RLS en catálogo, detalle, Storage y RPC geográfica.

### Pendiente
- Supabase confirma mediante consulta del usuario que 0005 está aplicada (`geospatial_column = true`, `nearby_rpc = true`) y 0006 no (`premium_schema = false`). Aplicar únicamente 0006 y validar RLS/checkout con cuenta de prueba.

## [0.12.0] — 2026-11-23

### Añadido
- `MapCanvas` basado en MapLibre 6.19.0, worker compatible con Next/Turbopack y capas raster OSM con atribución.
- Selector de coordenadas por click y arrastre en creación/edición de propiedades Admin.
- Ruta pública `/propiedades/mapa`, selección de zona, ubicación solicitada al usuario, búsqueda por radio, filtros de tipo/precio y selección sincronizada entre tarjetas y marcadores.
- Repositorio para RPC cercana PostGIS con una segunda consulta de fichas bajo RLS y generación de URLs firmadas de fotografías.

### Verificado
- `pnpm lint` y `pnpm typecheck` pasan.
- El build Turbopack del sandbox falla al crear proceso/enlazar puerto (`Operation not permitted`), limitación conocida y no atribuida al código.

### Pendiente
- Aplicar migración 0005 después de habilitar PostGIS, validar la RPC con propiedades que tengan coordenadas y ejecutar build desde Arch.

## [0.13.0] — 2026-11-23

### Añadido
- Mapa público de solo lectura en la ficha de cada publicación con coordenadas, centrado en el punto guardado.
- Mensaje de estado de búsqueda geográfica oculto antes de iniciar una consulta.

### Verificado
- `pnpm lint` y `pnpm typecheck` pasan.

## [0.11.0] — 2026-11-23

### Añadido
- Selector inicial de latitud/longitud en el formulario Admin con validación en servidor.
- Migración geoespacial 0005 preparada: `geography(Point,4326)`, trigger de sincronización, índice GiST y RPC de búsqueda pública acotada por radio.
- Configuración de URL de teselas en `.env.example` y documentación de habilitación PostGIS, privacidad geográfica y políticas de OSM.
- Logo PNG `Logo.png` copiado a `public/logos/paradise.png`; navbar/footer actualizados y referencia SVG de la interfaz retirada.

### Confirmado
- El usuario confirma que el flujo de propiedades, fotos, publicación e historial de precios funciona al 100%; Fase 6 se cierra funcionalmente.

### Pendiente
- Instalar MapLibre desde Arch; el sandbox no pudo resolver `registry.npmjs.org` al intentar añadir la dependencia.
- Habilitar PostGIS en Supabase `extensions`, aplicar 0005 y probar mapas/RPC/RLS.

## [0.10.0] — 2026-11-23

### Añadido
- Repositorio de catálogo Supabase con filtro de publicación/visibilidad y enlaces firmados de Storage; el inventario real vacío ya no se reemplaza con ejemplos.
- Página Admin `/admin/propiedades` para crear/editar fichas, guardar características, moderar, destacar y eliminar propiedades.
- Carga múltiple de fotografías con revisión de extensión/MIME/tamaño/firma básica, Storage privado y metadata relacionada en Postgres; eliminación coordinada del objeto y metadata.
- Imagen local de reemplazo para fichas sin foto y etiquetas que distinguen datos de ejemplo de publicaciones reales.
- Historial de precios visible en ficha, respaldado por la migración 0004 y trigger transaccional; la acción de edición bloquea cambios de precio hasta aplicar esa migración.

### Verificado
- `pnpm lint` y `pnpm typecheck` pasan.
- El usuario informa que la migración 0003 se aplicó sin error.
- La migración 0004 está escrita pero requiere aplicarse antes de cambiar precios.

### Pendiente
- Prueba funcional de alta, carga, publicación y lectura con un inmueble real en el Supabase del usuario.
- Matriz de políticas RLS con visitantes, cliente, agentes asignados/no asignados y Admin.

## [0.9.0] — 2026-11-23

### Añadido
- Migración inicial de Fase 6 para propiedades, asignaciones de agente, imágenes y características normalizadas.
- RLS y grants explícitos para catálogo público, agentes asignados y administración; policies de Storage para el bucket privado `property-images`.
- Índices de catálogo y restricciones para precios, estados, slug, coordenadas, formatos/tamaño y una portada por propiedad.
- Documentación de aplicación, alcance y validaciones pendientes de la migración.

### Estado
- La migración todavía debe aplicarse en el proyecto Supabase del usuario y probarse con identidades anon, cliente, agente asignado y admin.
- El catálogo frontend aún muestra datos de demostración; conectar el repositorio Supabase y la gestión visual de propiedades es el siguiente incremento de Fase 6.

## [0.1.0] — 2026-11-23

### Añadido
- Análisis inicial, propuesta de arquitectura modular y estructura App Router.
- Modelo relacional inicial, relaciones, esquema de roles y límites de RLS documentados.
- Documentación inicial de seguridad, API, despliegue, pruebas y exposición académica.
- Archivos de control del proyecto, variables de entorno ilustrativas y guía de contribución.

### Estado
- Fase 0 documentada. No hay aplicación ni funcionalidades de producto implementadas.

## [0.2.0] — 2026-11-23

### Añadido
- Esqueleto App Router con React, layout en español, página pública de inicio, 404 y boundary de error.
- Manifiesto con Next.js 16.3.0, React 19.3.0, Tailwind CSS 4.3.0 y TypeScript 5.9.x; configuración de TypeScript, ESLint, PostCSS y pnpm.
- Archivos `.gitignore` y `.nvmrc`.

### Pendiente
- No se instaló el conjunto de dependencias ni se generó `pnpm-lock.yaml`; el intento no recibió respuesta del registro.
- Lint, verificación de tipos, build e inicialización Git están pendientes.

## [0.2.1] — 2026-11-23

### Verificado
- No hay dependencias del proyecto en caché ni herramientas Next/React/TypeScript/ESLint globales.
- El registro npm oficial no respondió desde los intentos de instalación de pnpm.
- La comprobación HTTP independiente desde Node REPL también falla (`fetch failed`).
- `.git/` está vacío y no es escribible; no se inicializó ni alteró.

## [0.3.0] — 2026-11-23

### Añadido
- Lockfile pnpm y dependencias instaladas por el usuario.
- Repositorio Git inicializado.

### Verificado
- `pnpm lint` pasa.
- `pnpm typecheck` pasa.

### Pendiente
- `pnpm install --frozen-lockfile` no pudo crear su lock operativo en el store de solo lectura.
- `pnpm build` queda sin verificar: el sandbox bloquea el puerto local requerido por Turbopack y el proceso detached de TypeScript requerido por el modo Webpack.

## [0.4.0] — 2026-11-23

### Verificado
- En la terminal normal de Arch: `pnpm install --frozen-lockfile` pasó.
- `pnpm lint` y `pnpm typecheck` pasaron.
- `pnpm build` generó correctamente las rutas estáticas `/` y `/_not-found`.
- Repositorio Git inicializado.

### Observaciones
- Next.js en Node 26 imprime una advertencia no fatal deprecando `module.register()` (`DEP0205`).
- El sandbox de la sesión sigue bloqueando algunos procesos de build, aunque el build sí pasa en el entorno local del usuario.

## [0.5.0] — 2026-11-23

### Añadido
- Tokens de marca centralizados y valores semánticos separados para tema claro y oscuro.
- Bootstrap de tema antes de hidratar, detección de preferencia del sistema y persistencia local del visitante.
- Navbar con navegación móvil, control de tema, footer y portada inicial responsive.
- Componentes reutilizables de botón y avatar Premium con aro dorado animado.
- Foco visible, enlace para saltar contenido y respeto a `prefers-reduced-motion`.

### Verificado
- ESLint, TypeScript y parseo de CSS pasan.

### Pendiente
- Repetir `pnpm build` fuera del sandbox; el proceso Turbopack no puede enlazar su puerto local en el entorno del agente.

## [0.5.1] — 2026-11-23

### Verificado
- El usuario ejecutó el build local de Fase 2; `.next/BUILD_ID` y `.next/server/app/index.html` se actualizaron después de los cambios visuales.
- La revisión visual interactiva queda pendiente porque el navegador integrado no estuvo disponible en esta sesión.
- `PROGRESO.txt` y el README reflejan el estado actual sin marcar la fase como cerrada.

## [0.5.2] — 2026-11-23

### Verificado
- Revisión de la captura aportada por el usuario: portada de escritorio con tema claro, sin defectos visuales evidentes.
- Las reglas CSS definen un layout de una columna y navegación desplegable por debajo de 760 px; el comportamiento en dispositivo/viewport móvil aún no se ha observado.
- El estado de avance ahora distingue la revisión estática de escritorio de las comprobaciones de tema oscuro, móvil e interacción todavía pendientes.

## [0.6.2] — 2026-11-23

### Añadido
- Portada con búsqueda por ubicación/tipo y selección de propiedades destacadas de demostración.
- Catálogo con filtros por ubicación, tipo, precio, recámaras, baños, superficie, estado y visibilidad; ordenamiento y paginación.
- Tarjetas reutilizables, estado vacío y fichas con galería, descripción, características, resumen y metadatos Open Graph.
- Repositorio y reglas del catálogo separados en `features/properties`, con ocho registros ficticios claramente marcados.
- Fotografías ilustrativas con `next/image` y allowlist limitada al CDN de Unsplash.
- Navegación pública Inicio/Propiedades con ruta actual accesible.

### Verificado
- `pnpm lint`, `pnpm typecheck`, parseo CSS y smoke checks de filtros/paginación pasan.
- El usuario confirmó que el tema oscuro y la vista móvil de Fase 2 se ven bien.

### Pendiente
- El build de Fase 3 debe repetirse localmente: el sandbox bloquea el puerto interno usado por Turbopack.
- Revisar las rutas nuevas de inicio, catálogo y ficha en el navegador.
- La conexión a Supabase y las funciones de contacto, mapas, visitas, favoritos e historial siguen en fases posteriores.

## [0.6.1] — 2026-11-23

### Añadido
- El logo entregado en la raíz como `Logo.svg` se copió a `public/logos/paradise.svg` y se integró en navbar y footer.
- La persistencia objetivo se precisó: propiedad y metadata de imágenes en PostgreSQL (`properties`, `property_images`); archivos binarios en Supabase Storage, enlazados por ruta/FK.

### Confirmado
- El usuario revisó las nuevas rutas y confirmó que funcionan.
- La conexión real a Supabase y la persistencia de datos/imágenes continúan pendientes de sus fases respectivas.

## [0.6.0] — 2026-11-23

### Añadido
- Portada con búsqueda por ubicación/tipo y selección de propiedades destacadas de demostración.
- Catálogo con filtros por ubicación, tipo, precio, recámaras, baños, superficie y estado; ordenamiento por relevancia/precio y paginación.
- Tarjetas reutilizables, estado vacío y fichas individuales con galería, descripción, características, resumen y metadatos Open Graph.
- Repositorio y reglas de catálogo aislados en `features/properties`; ocho registros ficticios declarados como demostración.
- Optimización `next/image` para fotografía ilustrativa de Unsplash con allowlist acotada.
- Navegación pública Inicio/Propiedades con ruta actual accesible.

### Verificado
- `pnpm lint`, `pnpm typecheck` y parseo CSS pasan.
- Smoke checks de filtros, orden, paginación y cero resultados pasan.
- El usuario confirmó que tema oscuro y diseño móvil de Fase 2 se ven bien.

### Pendiente
- El build de Fase 3 debe repetirse localmente: el sandbox bloquea el puerto interno que usa Turbopack.
- Revisar inicio, catálogo y ficha nueva en el navegador local.
- Conectar propiedades reales, autenticación, contactos, mapas, visitas y demás módulos en sus fases correspondientes.

## [0.7.0] — 2026-11-23

### Añadido
- Base de Supabase SSR para navegador/servidor y renovación de sesión mediante `src/proxy.ts`.
- Registro, inicio de sesión, cierre, verificación/callback PKCE, recuperación y cambio de contraseña con validación Zod en servidor.
- Migración inicial de `profiles`, trigger de creación de perfil, RLS de acceso propio y bucket privado `property-images` con límites de MIME/tamaño.
- Rutas de autenticación y estilos responsivos, enlaces de acceso en la navegación.
- Errores del callback de verificación dirigidos a un aviso accesible en login.

### Pendiente / limitaciones
- En el primer intento, la instalación no alcanzó npm por DNS. El usuario ejecutó después `pnpm install` en Arch sin errores y el lockfile quedó actualizado.
- `pnpm lint` y `pnpm typecheck` pasan tras instalar los paquetes.
- El usuario informa que el enlace de verificación termina en una página de error local; falta inspeccionar URL (sin token/código) y texto exactos para aislar la causa.

## [0.8.0] — 2026-11-23

### Añadido
- Migración de roles base `client|agent|admin` y estados `active|suspended` en perfiles.
- Helper SQL `private.current_profile_role()` con RLS segura, privilegios mínimos y `search_path` vacío.
- RPC `admin_set_profile_access` que valida cambios sobre otras cuentas y escribe auditoría atómica en `audit_logs`.
- Contexto y guardas server-side reutilizables en `src/lib/permissions/access.ts`.
- Procedimiento documentado para promover el primer administrador mediante el dueño del proyecto.
- Página `/mi-cuenta`, edición del nombre con validación/Zod y RLS, `/admin/usuarios` para cambios de rol/estado y auditoría, navbar con sesión/rol/logout y layouts protegidos para rutas privadas de cliente, agente y admin.

### Pendiente
- El usuario informa que aplicó la migración de Fase 5 y promovió el primer Admin; falta probar RLS/RPC para cuentas cliente, agente y admin.
- Diagnosticar el enlace de confirmación de email cuando el usuario retome Fase 4.
- Migración no aplicada; faltan credenciales Supabase, URL redirect, configuración de correo y pruebas integradas reales.
- Roles y policies de objetos Storage siguen en Fases 5–6.
