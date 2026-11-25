# Estrategia de pruebas

**Estado:** Fase 15 en curso. Vitest 4 está configurado con `pnpm test`; 15 pruebas cubren filtros/paginación, fechas UTC de analítica, lectura de cuerpos HTTP limitada, esquemas de propiedades/CRM y mensajes seguros de Auth. Playwright ejecuta 5 E2E en Chromium; axe analiza portada, catálogo, registro, mapa, login y estados móvil/oscuro que cubren los flujos. `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan localmente. GitHub Actions y Vercel pasaron para la última versión desplegada; `/registro` respondió HTTP 200. Lighthouse en la portada: móvil LCP 1.0 s, CLS 0, TBT 70 ms; escritorio LCP 0.5 s, CLS 0, TBT 10 ms. No representa Web Vitals de campo. Faltan matriz RLS automatizada, prueba Auth con inbox, varias muestras Lighthouse del catálogo y datos CrUX suficientes. El build conserva el aviso no fatal `DEP0205` de Node 26.

## Unitarias — Vitest

- Reglas de elegibilidad Premium por intervalo de vigencia/estado.
- Transiciones permitidas de propiedades, publicación, visitas y CRM.
- Esquemas Zod y normalización de filtros, precios, moneda, coordenadas y archivos.
- Cálculos de páginas, métricas y deduplicación de eventos.
- Componentes aislados que contengan interacción significativa, con Testing Library.

## Integración — Supabase local/aislado

- Migraciones desde base vacía, índices, restricciones, triggers y RPC.
- RLS para `anon`, cliente A/B, Premium, agente asignado/no asignado y admin.
- Manipulación de rol/Premium, favoritos ajenos, propiedades no asignadas, CRM privado y auditoría inmutable.
- Operación atómica de cambios de precio, pago simulado y conflictos de horario concurrentes.
- Storage: propiedad de rutas, MIME, tamaño, eliminación y acceso a imágenes privadas si se definen.

## End-to-end — Playwright

- Catálogo/filtros/detalle y restricciones de propiedad Premium.
- Registro, login, recuperación, preferencias de tema y cuenta.
- Favoritos, listas, comparar hasta cuatro propiedades y solicitud/cancelación de visita.
- Flujo simulado exitoso/rechazado y vencimiento Premium bajo reloj controlado.
- Agente: asignación, visita y CRM; admin: aprobación, usuarios, ajustes y auditoría.
- Responsividad, teclado y estados de error/vacío en flujos críticos.
- Revisión manual en iPhone/Safari y Android/Chrome: hamburguesa abre/cierra, links navegan, tema cambia y persiste al recargar, menú de perfil abre, mapa arrastra con un dedo, pellizco acerca y los botones +/- responden. El usuario confirma que los cuatro controles principales funcionan al 100% en Vercel desde móvil; no se ha confirmado por separado Android.
- Si varios controles cliente dejan de responder a la vez y MapLibre queda en carga, inspeccionar en el dispositivo la consola y Network: errores de hidratación, status/MIME de `/_next/static/*`, WebSocket/HMR en desarrollo, worker de MapLibre y requests de teselas. Registrar host/puerto usados; no atribuirlo solo al sistema operativo sin evidencia.
- Verificar `/icons/paradise.png` con respuesta 200 y que el mismo recurso aparezca en favicon, Apple touch, vista previa Open Graph/Twitter, navbar y footer. Las plataformas de vista previa y pestañas pueden cachear el icono anterior.
- Verificar contraste calculado al cambiar tokens de tema: WCAG 2.2 AA exige 4.5:1 para texto normal, 3:1 para texto grande y tamaño de objetivo de al menos 24×24 CSS px con excepciones; Paradise aspira a 44–48 CSS px para controles táctiles.

Referencias de accesibilidad/interacción:
- [WCAG 2.2, contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2, tamaño mínimo de objetivo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Apple HIG, botones y áreas de interacción](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [MapLibre, opción cooperativeGestures](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/)

## Seguridad y calidad

- Pruebas negativas de autorización por rol, dueño, asignación y estado.
- Límites de tasa, sanitización, cargas de archivo, CSRF/session y exposición de variables.
- Verificación automatizada de tipos, lint y build; accesibilidad automatizada complementada con revisión manual.
- Sin datos personales reales en fixtures. Los datos semilla serán claramente sintéticos.

## Criterio de aceptación

La fase que introduzca cada función define sus casos de prueba y resultado observado en `PROGRESO.txt`. Los errores críticos de permisos, pérdida/inconsistencia de datos o exposición de secretos bloquean el avance de esa fase.

## Fase 15 — QA incremental

- Unitarias: `pnpm test` ejecuta `src/**/*.test.ts` con Vitest; casos actuales verifican filtros/orden de propiedades, periodos UTC, límite/decodificación del body, precio con centavos/coordenadas y validación CRM.
- Gates locales del incremento 1: `pnpm test`, `pnpm lint`, `pnpm typecheck` y `pnpm build` (Webpack) pasan.
- Los E2E requieren primero un build fresco con `pnpm build`; GitHub Actions sigue esta secuencia explícitamente.
- `pnpm test:e2e` pasa 4 pruebas en Chromium: portada/catálogo, etiquetas de login, navegación móvil con tema/perfil y controles del mapa. axe no encuentra violaciones en los scans de portada y catálogo claro/oscuro, login, mapa ni menú/perfil móvil.
- El primer scan oscuro detectó `.eyebrow` con contraste 3.85:1 y se cambió a `var(--color-muted)`. Una corrida posterior midió el tema durante su transición de 420 ms y recibió colores intermedios; el E2E ahora espera a que se estabilice la paleta y vuelve a pasar sin violaciones.
- `.github/workflows/quality.yml` define gates para PR/push a `main`: instalación congelada, lint, tipos, unitarias, build e E2E. Su ejecución en GitHub queda pendiente del próximo push autorizado.
- Smoke del servidor local de producción y remoto de solo lectura: portada, `/propiedades`, `/propiedades/mapa`, `/login` responden 200; una ruta inexistente responde 404; el icono remoto responde 200. Vercel incluye HSTS, `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`.
- Se tomó una sola muestra de TTFB por ruta; no reemplaza Lighthouse, Web Vitals ni prueba de carga.
- La inspección visual con teclado/lector de pantalla, iPhone/Safari y Android/Chrome y los flujos con cuentas Supabase no se repitieron en este incremento.

## Visitas — migraciones 0024 y 0025

- El usuario reporta que aplicó `202611250024_property_visits.sql`; esta sesión no inspeccionó el historial remoto. Antes de validar el inventario actual, aplicar `202611250025_property_inventory_standardization.sql` después de 0024 y comprobar que conserva las doce filas y sus relaciones.
- Cliente activo: solicitud desde propiedad disponible, horario local convertido a UTC, validación de dos horas–90 días, consulta propia, historial y cancelación antes del inicio; rechazar cliente suspendido, visitante, propiedad cerrada/no visible, UUID/fecha inválidos y exceso de longitud del mensaje.
- Agente: ver únicamente solicitudes de propiedades con asignación vigente; confirmar/rechazar, reprogramar, cancelar y marcar realizada/inasistencia. Tras revocar la asignación debe perder lectura y gestión de visitas previas. Admin: gestionar todas. Agente no asignado, Cliente y cuenta suspendida no deben cambiar estados ni leer solicitudes ajenas.
- En base aislada, dos solicitudes solapadas de la misma propiedad y de un mismo agente no deben confirmarse simultáneamente; probar escrituras concurrentes, reprogramación, cancelación que libera el horario y transiciones inválidas. Verificar que cada cambio de estado/horario aparezca en `visit_request_history`.
- El flujo usa propuestas de horario con confirmación del equipo; todavía no publica un selector de disponibilidad en tiempo real.
- Como Cliente, comprobar en las doce fichas guardar/quitar favorito, lista, comparar, actividad, consulta CRM y solicitud de visita; como Agente/Admin comprobar agenda, CRM, mapa y CRUD. Las fichas deben pasar por las reglas normales de publicación y disponibilidad.

## Fase 4 — Auth y migración inicial

- Unitarias: normalización/validación de email, longitud de contraseña, coincidencia de confirmación, rechazo de parámetros extras de redirección.
- Integración Supabase: migración desde base vacía; trigger al crear usuario; perfil propio legible/editable; denegar lectura ajena, INSERT, modificación de id u otras columnas; bucket privado y límites.
- E2E: registro con verificación, login/logout, correo de recuperación, uso único/expiración de enlace, cambio de contraseña y mensajes que no revelen si existe un correo.
- E2E público actual: `/registro` muestra nombre, correo y contraseña etiquetados, mínimo de 10 caracteres y pasa axe. El submit real requiere inbox de prueba y no forma parte de E2E aislado.
- Diagnóstico: el endpoint público de configuración de Supabase confirmó `disable_signup=false`, email habilitado y `mailer_autoconfirm=false`; por eso cada alta nueva necesita verificar correo. Una alta real no se envió durante el diagnóstico para evitar crear una cuenta huérfana.
- Si el alta devuelve error, Vercel registra únicamente `code`/`status` de Auth. Revisar esos dos campos en logs de la Server Action, sin registrar correo, contraseña ni el cuerpo de solicitud.
- Solo marcar estos flujos completos después de correrlos con un proyecto Supabase de desarrollo y correo accesible.
- En esta sesión, `pnpm lint` y `pnpm typecheck` pasan. `pnpm build` queda bloqueado por el sandbox al enlazar un puerto interno de Turbopack (`Operation not permitted`); el usuario debe repetirlo en su terminal local.

## Fase 5 — Roles y permisos

- Unitarias: validación de roles/estados reconocidos; guardas permiten solo roles autorizados y bloquean cuentas suspendidas.
- Integración/RLS: cliente ve solo su perfil; cliente/agente no leen perfiles ajenos ni `audit_logs`; Admin activo puede leerlos; Admin suspendido pierde acceso administrativo.
- Escalamiento: los grants no permiten cambiar `base_role`/`account_status`; el RPC rechaza no-admin, valores inválidos y auto-modificación; otro Admin puede hacer el cambio y queda una fila auditada con antes/después en la misma transacción.
- En esta sesión `pnpm lint` y `pnpm typecheck` pasan. No hay `psql`/Supabase CLI ni acceso de red al proyecto desde el sandbox; no se ejecutó la migración ni las pruebas SQL.
- El usuario reporta que aplicó la migración y preparó el primer Admin. Se añadieron `/mi-cuenta`, `/admin/usuarios` con roles/estados/auditoría, edición del nombre con sesión y layouts protegidos; falta probarlos localmente con cuentas de cada rol.

## Fase 6 — Propiedades, asignaciones y Storage

- Aplicar la migración desde la base ya migrada por Fases 4–5; revisar que restricciones e índices se creen sin error.
- RLS positiva/negativa: visitante solo ve propiedades aprobadas públicas/ambas; cliente no puede insertar, editar, borrar o ver borradores; agente solo ve propiedades asignadas; Admin gestiona propiedades; un usuario nunca puede asignar un agente que no tenga rol activo de agente.
- Storage privado: visitante obtiene acceso únicamente a imágenes de ficha pública aprobada; Admin puede subir/leer/editar/borrar dentro del bucket y no en otros buckets; rechazar rutas de otro bucket o sin prefijo de propiedad.
- Metadata: rechazar MIME no permitido, archivos mayores de 10 MiB, ruta incompatible con propiedad, segunda portada y referencias FK inválidas.
- Estado actual: el usuario confirma que el flujo de propiedad, fotos, publicación e historial funciona al 100% y que RLS está aprobado. La sesión no repitió pruebas directas por identidad; mantener los casos como regresión ante futuros cambios.
- El usuario probó el flujo de precio respaldado por 0004; falta probar atomicidad en rollback e inmutabilidad/RLS con cliente y Admin.
- En esta sesión, `pnpm lint` y `pnpm typecheck` pasan; `pnpm build` falló por el sandbox al enlazar el puerto interno de Turbopack (`Operation not permitted`). El usuario puede repetirlo en su terminal Arch habitual.

## Fase 7 — Coordenadas y mapa

- Dependencias: el usuario reporta habilitar PostGIS e instalar MapLibre; confirmó en SQL Editor la firma de la RPC de 0005. La RPC, lectura de catálogo y página pública de mapa respondieron HTTP 200; el SSR de la búsqueda de 5 km mostró una ficha. El usuario confirma que el mapa funciona.
- Unitarias: rangos de latitud/longitud, radio 100 m–50 km, límite 1–100, coordenadas incompletas y filtros de visibilidad.
- Integración: trigger actualiza geography desde lat/lng; índice GiST presente; RPC ordena por distancia, limita resultados y respeta publicación/RLS.
- E2E: Admin guarda punto desde mapa y al cliente el mapa sincroniza marcadores, resultados y filtros; interacción teclado/táctil y atribución visible.
- Proveedor OSM: no precargar teselas; respetar caché, referer y atribución. La geocodificación debe ser iniciada por el usuario y limitada; no autocompletar contra Nominatim público.
- Estado: MapLibre, selector Admin, mapa público y repositorio/RPC integrados. El usuario confirma que los mapas se muestran. Sondeo RPC, lectura del catálogo y página de mapa por radio: HTTP 200; el HTML mostró una ficha. No se observó interacción de mapa en navegador en esta sesión.

## Fase 8 — Premium simulado

- El usuario reporta 0006 aplicada; aplicar únicamente 0007. El plan demo único, tablas, constraints e índices de 0006 no deben duplicarse.
- RLS: cliente ve sus suscripciones y simulaciones; otro cliente no puede leerlas ni manipularlas; Admin gestiona/lee planes e historial; anon ve solo planes activos.
- RPC: rechaza visitante, agente, Admin, cuenta suspendida, plan inexistente/inactivo y resultado fuera de `succeeded|declined`; permite escenarios ficticios solo para Cliente activo.
- Integridad transaccional: un éxito crea periodo activo y pago simulado; un rechazo crea solicitud pendiente y evento rechazado; ambas escrituras y auditoría deben quedar juntas o revertirse.
- Renewal concurrente: serializar acciones del mismo usuario y verificar que periodos exitosos consecutivos no se solapan.
- Entitlement: acceso solo dentro de `starts_at <= now() < expires_at`; al vencer, no se leen propiedades Premium ni sus metadata/objetos de Storage.
- Revisar que la UI nunca pida tarjeta/CVV y que éxito/rechazo estén identificados como simulación, no ingreso real.
- Cancelación: Cliente activo cancela solo sus periodos `active` con `expires_at > now()`; Agente/Admin/visitante no ejecutan la RPC propia; Admin usa `admin_cancel_premium_subscription`; cada suscripción cancelada queda enlazada a su propio ID en auditoría; no hay reembolso ni datos bancarios.
- Administración: Admin crea/edita planes (precio, duración, beneficios, activo); anon y Cliente no mutan `subscription_plans`; el historial de suscripciones/simulaciones es de solo lectura para el titular y Admin.
- Estado actual: el usuario confirma que el flujo Premium completo funciona después de separar los estados de los módulos `"use server"` y reiniciar el servidor. `pnpm lint`, `pnpm typecheck` y `git diff --check` pasan. Fase 8 queda validada funcionalmente por el usuario; las pruebas automatizadas y negativas de RLS permanecen en Fase 14.

## Fase 9 — Dashboard operativo inicial

- Solo Admin activo puede abrir `/admin`; la consulta se ejecuta con la sesión Supabase del usuario y respeta RLS.
- Las gráficas muestran creación de propiedades en seis meses, distribución de estados de publicación/comerciales y simulaciones aprobadas/rechazadas en cuatro semanas.
- El tablero incluye cambios de precio recientes desde `property_price_history`, además de conteos de inventario, publicaciones, Clientes, planes y vigencias.
- Las simulaciones se etiquetan como pruebas; no se muestran como ingresos.
- Si una consulta falla, la cifra se muestra como no disponible, no como cero. No se simulan datos ni vistas web.
- Validar con una base Supabase poblada: conteos contra consultas SQL equivalentes, rol Admin, permisos y estado vacío.
- Estado actual: el usuario encontró 404 porque la página se creó en una carpeta con comillas literales en vez del route group `(admin)`; se corrigió. Después pidió gráficas sustantivas. El usuario confirma que tracking y gráfica diaria funcionan; las pruebas negativas detalladas siguen pendientes.
- Incremento de vistas 0008: comprobar en base aislada que visita pública suma una vez por ficha/pestaña/día; otra ficha suma; sesión sin entitlement y propiedad no pública no suman; límite de 30 fichas/día; endpoint rechaza origen/payload inválido; Cliente no puede invocar agregación; Admin recibe totales diarios; eventos antiguos se eliminan durante limpieza oportunista. El usuario confirma funcionamiento general, sin sustituir esta matriz de pruebas.
- Incremento de ranking 0009: probar fechas inválidas, límite 1–20, máximo 90 días, acceso denegado a Cliente y top ordenado por conteo para Admin.
- Incremento de breakdown 0010: comparar totales por tipo y las 10 ciudades con las vistas registradas; probar rango >90 días y denegación a perfiles que no sean Admin activo.
- Export CSV: Admin descarga UTF-8 con 7/28/90 días y filas diarias, top 10 y breakdowns concordantes con el panel; el valor elegido se comparte con las gráficas y un valor inválido usa 28; visitante recibe 401 y Cliente/Agente/Suspendido 403; errores RPC no descargan archivo parcial; textos que empiezan por `=`, `+`, `-` o `@` quedan neutralizados para hojas de cálculo y no se exportan sesiones/eventos.

## Fase 10 — Perfiles profesionales de agentes

- El usuario confirma que 0010 y sus gráficos/CSV funcionan; no verificamos directamente la migración remota.
- Implementación inicial revisada con `pnpm lint`, `pnpm typecheck` y `git diff --check`.
- El usuario confirma que los perfiles 0011 funcionan tras aplicarla. Admin puede crear/editar perfil de cuenta con rol Agente; slug duplicado se rechaza; los límites de listas y biografía se validan; visitante lee solo perfil publicado de agente activo; cuenta suspendida y perfil despublicado no aparecen; Cliente/Agente no guardan datos profesionales; Admin puede despublicar incluso perfil de cuenta suspendida.
- El usuario confirma que el dashboard de cartera y las asignaciones funcionan tras aplicar 0012. La matriz independiente pendiente de Fase 14 comprobará roles, cuenta suspendida, asignación revocada, borrador y visibilidad pública.
- CRM 0013: una consulta válida crea un lead y lo asigna al agente activo de la propiedad; sin agente activo queda visible solo a Admin; propiedad vendida, no aprobada, privada sin entitlement o consentimiento falso no crea lead; el cuarto envío reciente del mismo correo/propiedad se limita; visitante/Cliente no leen leads; agente asignado sí; otro agente y cuenta suspendida no; cambios de etapa generan historial; notas solo aparecen a equipo autorizado; Admin y Agente no escriben notas como otro actor.
- API CRM: rechazar origin ausente/foráneo, content type distinto de JSON, JSON inválido y body mayor a 4 KiB; en desarrollo local aceptar solo origen con el mismo host; honeypot lleno responde éxito sin insertar lead; el rate limit por correo/propiedad del RPC sigue activo. El usuario decidió omitir el rate limit WAF por costo, así que no se espera un 429 de firewall.
- API analytics: confirmar que el body mayor a 512 bytes se corta durante lectura, no tras cargarlo completo; comprobar origin/content type/JSON/UUID inválidos y respuesta 503 controlada ante fallo de RPC.
- Revisar estados sin migración, sin agentes, sin biografía/listas y en móvil. No presentar un perfil ficticio si no hay cuentas reales.

## Fase 11 — Herramientas del cliente, incremento 1

- El usuario confirma que CRM funciona; Fase 10 se considera validada funcionalmente por su reporte. Esta sesión no consultó el historial remoto de migraciones.
- Estado del incremento: favoritos y comparación implementados; `pnpm lint`, `pnpm typecheck`, parseo PostCSS y `git diff --check` se ejecutan tras los cambios. No se ejecutó suite de pruebas ni pruebas de producto.
- Aplicar 0014 en el proyecto Supabase antes de probar persistencia. Con dos Clientes, confirmar que cada uno solo ve/retira sus propios favoritos; una cuenta suspendida o rol distinto no debe leer ni escribir. Comprobar alta, baja, duplicado idempotente y rechazo de propiedad que no sea visible.
- Probar `/favoritos` vacío, propiedad eliminada/archivada, error de esquema pendiente y acceso no Cliente. Confirmar que al volver a cargar se conservan filas guardadas.
- Probar comparación con una, cuatro y cinco propiedades; persistencia al navegar/recargar; quitar una y vaciar lista. Si hay IDs viejos/no visibles, deben quedar fuera de la tabla y la página debe permitir limpiar la selección guardada. Las doce propiedades del inventario actual deben admitir favoritos, comparación y consultas bajo las mismas reglas que el resto.

## Fase 11 — Listas personales, incremento 2

- El usuario confirma que favoritos y comparación funcionan; 0014 se considera validada por su reporte, sin inspección directa del historial remoto.
- Estado: crear/renombrar/eliminar listas y administrar sus propiedades implementado; `pnpm lint` y `pnpm typecheck` pasan. No se ejecutaron pruebas de producto ni se consultó Supabase remoto.
- Aplicar 0015 y probar con dos Clientes que cada uno solo puede leer, renombrar, modificar o borrar sus listas y elementos. Probar rol Agente, Admin y cuenta suspendida.
- Probar nombre vacío, límite de 40 caracteres, duplicado normalizado, agregar favorito propio visible, rechazo de propiedad no favorita/invisible, duplicado de elemento y quitar elemento.
- Confirmar que borrar lista elimina solo sus elementos asociados, no las filas de `favorites`; borrar propiedad limpia referencias por cascada. Revisar lista vacía, sin favoritos disponibles y ficha que dejó de ser visible.

## Fase 11 — Historial de actividad, incremento 3

- El usuario confirma que listas y herramientas anteriores funcionan; 0014–0015 se consideran validadas según su reporte, sin inspección directa del historial remoto.
- Estado: `/mi-actividad` y captura de eventos implementadas; `pnpm lint`, `pnpm typecheck`, parseo PostCSS y `git diff --check` pasan. No se ejecutaron pruebas de producto ni se consultó Supabase.
- El usuario confirma que 0016 y el historial funcionan; repetir esta matriz detallada de roles y retención durante la Fase 14 de seguridad.
- Guardar/retirar favorito y enviar consulta real; revisar eventos correctos y ausencia de nombre/correo/mensaje/IP/búsqueda en `user_activity`. Una segunda cuenta no debe poder leer ni insertar directamente filas.
- Comprobar límite de 500 eventos por cuenta, ficha eliminada/retirada (evento sin título enlazable), propiedad Premium solo para membresía vigente y estado vacío cuando no hay actividad.

## Fase 12 — Notificaciones in-app, incremento 1

- El usuario confirma que herramientas de cliente e historial funcionan; 0014–0016 se consideran validadas según su reporte, sin inspección directa del historial remoto.
- Estado: `/notificaciones`, triggers Premium/CRM, acciones de lectura y contador en navegación implementados; el usuario confirma funcionamiento de 0017. No se ejecutaron pruebas independientes ni se consultó Supabase.
- Aplicar 0017. Simular una compra exitosa y cancelar; comprobar avisos Premium correctos. Cambiar etapa de lead de Cliente autenticado; comprobar aviso con la etapa nueva. Una consulta recién creada (`previous_stage` null), rechazo simulado y cambio de etapa de lead anónimo no deben generar aviso.
- Con dos Clientes, comprobar que cada uno solo lee y marca sus avisos. Visitante/Agente/Admin/Suspendido no leen ni actualizan; authenticated no puede cambiar título/tipo/destinatario ni insertar. Marcar una y todas como leídas y verificar que el badge disminuye/desaparece.
- Revisar estado vacío, migración no aplicada y móvil. Confirmar que la interfaz indica que los avisos son in-app, sin afirmar envío por correo/SMS.

## Fase 13 — Configuración y SEO, incremento 1

- Estado: metadatos dinámicos, canonical, sitemap, robots, `noindex` privado y `/admin/configuracion` implementados. El usuario confirma que funciona 0018 según reporte; no hubo inspección remota ni pruebas de producto independientes.
- La verificación automatizada de roles de 0018 sigue pendiente: Admin puede guardar nombre, frase, descripción SEO y contacto; Cliente/Agente/anon no pueden escribir. Lectura pública solo devuelve esos campos intencionalmente públicos.
- Validar correo válido/vacío, límites de longitud, persistencia, salida escapada, y que footer/metadata reflejan valores guardados. Confirmar contacto vacío cuando no existe información aprobada.
- Revisar `/sitemap.xml` para que solo incluya rutas y fichas públicas visibles, `/robots.txt` para sitemap y exclusiones, canonicals en portada/catálogo/detalle/directorio/agente y `noindex` en login/cuenta/paneles.
- Configurar `NEXT_PUBLIC_SITE_URL` con el dominio real antes de comprobar sitemap/robots/canonical en despliegue; con fallback local, esos URLs no representan el sitio publicado.
- En Vercel Production, si falta `NEXT_PUBLIC_SITE_URL`, los links Auth usan `VERCEL_PROJECT_PRODUCTION_URL` (o `VERCEL_URL` como fallback). Confirmar que Supabase Auth tiene el Site URL canónico y la URL exacta `/auth/callback` en Redirect URLs; probar confirmar email y recuperar contraseña desde Production. Probar que el código PKCE termina en `/verificar-email` o `/auth/cambiar-password`, no en la raíz ni en el dashboard de Vercel.

## Fase 14 — Revisión de permisos, incremento 1

- El usuario reporta que nombre/SEO funcionan, pero correo/teléfono no se guardaban. Se corrigió el upsert para omitir la llave singleton sin grant UPDATE; validar después del deployment sin repetir 0018.
- Revisión estática encontró en `agent_assignments` permiso de borrado y actualización de `assigned_by` bajo la policy `FOR ALL` de Admin. 0019 limita las columnas de escritura y quita DELETE; el usuario confirma el flujo, sin verificación SQL independiente.
- Tras aplicar 0019: como Admin activo, crear asignación y revocarla; confirmar que Cliente, Agente y Admin suspendido no pueden asignar/revocar; confirmar que `assigned_by` debe coincidir con `auth.uid()`, y que insertar revocada, cambiar actor/relaciones, reactivar o DELETE fallan aun vía Data API directa.
- El usuario confirma la matriz RLS aprobada para perfiles, propiedades/Storage, Premium, CRM y módulos de cliente. No se reprodujeron pruebas directas en esta sesión; automatizar estos casos antes de cambios de políticas.
- Incremento 2: CRM y analítica comparan `Origin` contra `NEXT_PUBLIC_SITE_URL` o dominio Vercel de fallback en Production; desarrollo acepta solo el mismo host. Ejecutar smoke checks para origen canónico, origen foráneo, encabezado ausente y content type inválido.
- Verificar las cabeceras base en páginas públicas, privadas y rutas API: `nosniff`, `DENY`, `strict-origin-when-cross-origin` y permisos restringidos. HSTS está configurado para Vercel, pero aún no se verificó en un deployment.
- En el incremento de endurecimiento, verificar `Strict-Transport-Security: max-age=31536000` solo en Vercel y ausencia de `X-Powered-By`; no debe forzar HSTS en hosts locales HTTP. CSP requiere validar Next scripts/estilos, imágenes Unsplash, Supabase y mapas antes de activarse.
- Incremento 3: el usuario confirma que 0020 y su flujo funcionan; no se inspeccionó Supabase ni se ejecutó prueba SQL independiente.
- Incremento 4: el usuario reporta que 0021 parece funcionar. Con anon y Cliente, comprobar que propiedades, imágenes e historial solo devuelven columnas permitidas; los campos privados y los IDs de actor deben dar error de permiso al seleccionarlos directamente. Confirmar que `property_private_details` no se lee como anon/Cliente; Admin y agente activo asignado leen solo dirección, código postal y coordenadas exactas, sin columnas de actor/timestamps. Agente no asignado y suspendido deben quedar bloqueados. Verificar alta/edición Admin, mapa, búsqueda por radio e imágenes con columnas reducidas.
- El usuario informa que 0021 parece funcionar. La matriz anterior aún requiere evidencia por identidad y pruebas directas de columnas/permisos.

## Fase 14 — Navegación responsive, incremento 5

- El usuario confirma que los controles y mapa funcionan al 100% en Vercel desde móvil. Revisión por separado de Android y escritorio no documentada.
- La inspección anterior verificó lint y tipos; no tuvo acceso al navegador del dispositivo para contrastar la experiencia.

## Verificaciones ejecutadas en Fase 3

- `pnpm lint`: pasa.
- `pnpm typecheck`: pasa.
- Parseo PostCSS de los archivos CSS de la aplicación y tokens: pasa.
- Smoke checks de defaults sin límites, filtros, orden por precio, paginación y resultado vacío: pasan.
- `pnpm build`: no completó dentro del sandbox porque Turbopack intenta enlazar un puerto local y el sistema responde `Operation not permitted`; debe repetirse en la terminal local de Arch.
- Revisión visual de las rutas nuevas: pendiente hasta disponer del build/dev server local.

## Corrección de recuperación Auth — 2026-11-24

Pruebas unitarias del callback con Supabase simulado: PKCE de recuperación sin `next`, tokens de recuperación/confirmación, tipos inválidos, enlaces vencidos, credenciales ausentes y rechazo de redirecciones externas. Mensajes de contraseña repetida, expiración y límites de envío. Estas pruebas no confirman SMTP, cookies en un navegador real ni configuración remota. Validación local: 26 unitarias, lint, tipos y build pasan. Cinco E2E existentes pasaron y el nuevo escenario de recuperación pasó en ejecución focalizada después de corregir un selector ambiguo; incluye axe y redirección real del callback sin credenciales.

Pendiente con un inbox real: solicitar recuperación, abrir el correo más reciente, guardar una contraseña diferente y comprobar login nuevo; repetir expiración/uso único y registro/confirmación. Para otro navegador, aplicar las plantillas token_hash de `supabase/templates` antes de solicitar el correo.

## Avisos SMTP de consultas

Tres pruebas con transporte simulado comprueban ausencia de envío sin contraseña de aplicación, Gmail como destinatario fijo con Reply-To del visitante, y fallo SMTP sin datos personales en logs. `pnpm test` (29), lint y build pasan localmente; el build tuvo que ejecutarse fuera del sandbox por el fallo conocido de TypeScript `--showConfig`. Falta envío real y validación de 0023/CRM contra Supabase.

## Consulta CRM desde móvil

La RPC requiere sesión anónima o un Cliente activo; una sesión Admin/Agente/suspendida se rechaza. El usuario confirmó que el móvil tenía una sesión Admin y que funciona con cuenta Cliente, por lo que no se necesita un cambio de backend. El formulario recorta el correo de autofill y usa atributos de email compatibles con iOS.

## Revisión del rediseño responsive

Para cada ruta pública y de cuenta, revisar a 360–390 px, 768 px y 1280 px: que no haya desplazamiento horizontal, el menú/perfil/tema se puedan tocar, los campos queden a 16 px en pantallas táctiles, los CTAs no se salgan de pantalla y las tablas puedan desplazarse dentro de su contenedor. Comprobar el tema claro/oscuro, foco por teclado y `prefers-reduced-motion`. El usuario revisó capturas y pidió compactar pie, cabecera móvil y filtros; se aplicaron esos ajustes. Lint, typecheck, parseo PostCSS y `git diff --check` pasan. El log de Next registró `Compiled in 1789ms`; no se ejecutaron pruebas de producto. No se hizo un nuevo screenshot tras el ajuste, porque CUA sigue sin acceder al host del navegador.

## Motion y entradas animadas

La aplicación usa Motion for React con `MotionConfig reducedMotion="user"`. Revisar a 360–390 px y 1280 px: entrada hero, reveals de secciones al hacer scroll, hover de tarjetas en puntero, menú de perfil y cambio de tema; con `prefers-reduced-motion: reduce`, los desplazamientos/escala deben reducirse. El log de Next confirmó compilación; lint y typecheck pasan. Falta revisión visual manual del resultado animado en ambos tamaños.

## Revisión del refinamiento visual — 2026-11-25

Se corrigió el botón de perfil para mostrar un único contorno (el aro dorado solo se conserva para Premium). La portada añadió jade, bosque, arcilla y arena sobre las superficies neutras existentes. `pnpm lint`, `pnpm typecheck`, `git diff --check` y `pnpm build` pasan; build mantiene el aviso no fatal `DEP0205`. No se ejecutaron pruebas de producto. Revisar en tema claro/oscuro a 360–390 px y 1280 px: el panel verde debe mantener legibilidad, la tarjeta de cierre no debe recortar contenido, y el perfil debe conservar foco visible y un área táctil cómoda. La inspección visual manual sigue pendiente; sin push.

## Turbopack/HMR y acceso por LAN — 2026-11-25

El log local registró errores internos repetidos `CellId ... no longer exists` en HMR de Turbopack; el archivo `.next/dev/lock` apuntaba a un PID que ya no existía. `dev` ahora usa Webpack y `--hostname 0.0.0.0`; el usuario reinició y confirma que el blur desapareció al acceder por IP. No ejecutar el build en paralelo con dev: comparten `.next`. CUA no tiene navegador disponible, así que queda pendiente la revisión visual independiente. El usuario autorizó push junto con la petición de estilizar todos los `select`.

Los `select` sencillos ahora reciben flecha de marca, estados de hover/foco, tema oscuro y tamaño táctil. Confirmar selección en Safari iOS, Chrome Android y escritorio; el menú de opciones sigue siendo nativo.

## Inventario de doce propiedades — 2026-11-25

El usuario reporta que las doce filas ya están en Supabase. Con Admin, verificar que cada una se edita mediante el formulario estándar, conserva fotos/coordenadas/características y mantiene su publicación. Con Cliente, probar favorita y lista, comparación, actividad, consultas CRM y solicitud/cancelación de visitas. En mapa comprobar que cada ubicación aparezca si tiene coordenadas. La migración 0025 renombra los slugs antiguos, limpia texto almacenado y conserva IDs y relaciones. El usuario reporta 0024 aplicada; 0025 está local y pendiente de aplicar. No se hizo push.
