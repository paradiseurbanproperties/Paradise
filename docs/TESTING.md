# Estrategia de pruebas

**Estado:** estrategia de todo el proyecto. Fase 3 ejecutó lint, verificación TypeScript, parseo CSS y smoke checks de las reglas puras del catálogo con el test runner integrado de Node; aún no existe una suite formal Vitest/Playwright. En Fase 6 `pnpm lint` y `pnpm typecheck` pasan; el build quedó bloqueado por el sandbox de Turbopack. El usuario confirmó el flujo funcional de propiedades, Storage, publicación e historial de precios y reporta que el enlace de verificación Auth ya funciona; la batería Auth no se ha probado de extremo a extremo en esta sesión.

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
- Revisión manual en iPhone/Safari y Android/Chrome: hamburguesa abre/cierra, links navegan, tema cambia y persiste al recargar, menú de perfil abre, mapa arrastra con un dedo, pellizco acerca y los botones +/- responden. No declarar móviles validados por una revisión CSS estática.
- Si varios controles cliente dejan de responder a la vez y MapLibre queda en carga, inspeccionar en el dispositivo la consola y Network: errores de hidratación, status/MIME de `/_next/static/*`, WebSocket/HMR en desarrollo, worker de MapLibre y requests de teselas. Registrar host/puerto usados; no atribuirlo solo al sistema operativo sin evidencia.
- Verificar `/icons/paradise.png` con respuesta 200, favicon en pestaña, Apple touch icon y metadatos Open Graph/Twitter en vista previa. Las plataformas de vista previa pueden cachear la imagen anterior.
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

## Fase 4 — Auth y migración inicial

- Unitarias: normalización/validación de email, longitud de contraseña, coincidencia de confirmación, rechazo de parámetros extras de redirección.
- Integración Supabase: migración desde base vacía; trigger al crear usuario; perfil propio legible/editable; denegar lectura ajena, INSERT, modificación de id u otras columnas; bucket privado y límites.
- E2E: registro con verificación, login/logout, correo de recuperación, uso único/expiración de enlace, cambio de contraseña y mensajes que no revelen si existe un correo.
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
- Estado actual: el usuario confirma que el flujo de propiedad, fotos, publicación e historial funciona al 100%. La matriz RLS multirrol sigue pendiente.
- El usuario probó el flujo de precio respaldado por 0004; falta probar atomicidad en rollback e inmutabilidad/RLS con cliente y Admin.
- En esta sesión, `pnpm lint` y `pnpm typecheck` pasan; `pnpm build` falló por el sandbox al enlazar el puerto interno de Turbopack (`Operation not permitted`). El usuario puede repetirlo en su terminal Arch habitual.

## Fase 7 — Coordenadas y mapa

- Dependencias: el usuario reporta habilitar PostGIS e instalar MapLibre; la migración 0005 consta aplicada según consulta del usuario; probar RPC con datos reales.
- Unitarias: rangos de latitud/longitud, radio 100 m–50 km, límite 1–100, coordenadas incompletas y filtros de visibilidad.
- Integración: trigger actualiza geography desde lat/lng; índice GiST presente; RPC ordena por distancia, limita resultados y respeta publicación/RLS.
- E2E: Admin guarda punto desde mapa y al cliente el mapa sincroniza marcadores, resultados y filtros; interacción teclado/táctil y atribución visible.
- Proveedor OSM: no precargar teselas; respetar caché, referer y atribución. La geocodificación debe ser iniciada por el usuario y limitada; no autocompletar contra Nominatim público.
- Estado: MapLibre, selector Admin, mapa público y repositorio/RPC integrados. `pnpm lint` y `pnpm typecheck` pasan. Usuario reporta instalar MapLibre y habilitar PostGIS; migración 0005 confirmada por consulta; prueba con datos reales pendiente. La revisión visual del usuario confirmó los mapas. Build sigue bloqueado por permisos de puerto/proceso de Turbopack en este sandbox.

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
- CRM 0013: una consulta válida crea un lead y lo asigna al agente activo de la propiedad; sin agente activo queda visible solo a Admin; propiedad demo, vendida, no aprobada, privada sin entitlement o consentimiento falso no crea lead; el cuarto envío reciente del mismo correo/propiedad se limita; visitante/Cliente no leen leads; agente asignado sí; otro agente y cuenta suspendida no; cambios de etapa generan historial; notas solo aparecen a equipo autorizado; Admin y Agente no escriben notas como otro actor.
- Revisar estados sin migración, sin agentes, sin biografía/listas y en móvil. No presentar un perfil ficticio si no hay cuentas reales.

## Fase 11 — Herramientas del cliente, incremento 1

- El usuario confirma que CRM funciona; Fase 10 se considera validada funcionalmente por su reporte. Esta sesión no consultó el historial remoto de migraciones.
- Estado del incremento: favoritos y comparación implementados; `pnpm lint`, `pnpm typecheck`, parseo PostCSS y `git diff --check` se ejecutan tras los cambios. No se ejecutó suite de pruebas ni pruebas de producto.
- Aplicar 0014 en el proyecto Supabase antes de probar persistencia. Con dos Clientes, confirmar que cada uno solo ve/retira sus propios favoritos; una cuenta suspendida o rol distinto no debe leer ni escribir. Comprobar alta, baja, duplicado idempotente y rechazo de propiedad que no sea visible.
- Probar `/favoritos` vacío, propiedad eliminada/archivada, error de esquema pendiente y acceso no Cliente. Confirmar que al volver a cargar se conservan filas guardadas.
- Probar comparación con una, cuatro y cinco propiedades; persistencia al navegar/recargar; quitar una y vaciar lista. Si hay IDs viejos/no visibles, deben quedar fuera de la tabla y la página debe permitir limpiar la selección guardada. La interfaz debe identificar datos demo y no presentar datos ficticios como reales.

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

## Fase 14 — Revisión de permisos, incremento 1

- El usuario confirma que la configuración/SEO de Fase 13 funciona y 0018 se considera validada por su reporte; no se consultó Supabase directamente.
- Revisión estática encontró en `agent_assignments` permiso de borrado y actualización de `assigned_by` bajo la policy `FOR ALL` de Admin. 0019 limita las columnas de escritura y quita DELETE; el usuario confirma el flujo, sin verificación SQL independiente.
- Tras aplicar 0019: como Admin activo, crear asignación y revocarla; confirmar que Cliente, Agente y Admin suspendido no pueden asignar/revocar; confirmar que `assigned_by` debe coincidir con `auth.uid()`, y que insertar revocada, cambiar actor/relaciones, reactivar o DELETE fallan aun vía Data API directa.
- Repetir matrices RLS pendientes para perfil/rol, propiedades/Storage, Premium, CRM, favoritos/listas/actividad y notificaciones. No marcar seguridad global cerrada sin ejecutar pruebas con identidades distintas.
- Incremento 2: el endpoint de analítica compara `Origin` contra `NEXT_PUBLIC_SITE_URL` y valida el media type JSON. Ejecutar smoke checks para origen canónico, origen foráneo, encabezado ausente y content type inválido; aún no se ejecutaron.
- Verificar las cabeceras base en páginas públicas, privadas y rutas API: `nosniff`, `DENY`, `strict-origin-when-cross-origin` y permisos restringidos. Comprobar en la revisión de despliegue si se puede adoptar CSP/HSTS.
- Incremento 3: el usuario confirma que 0020 y su flujo funcionan; no se inspeccionó Supabase ni se ejecutó prueba SQL independiente.
- Incremento 4: aplicar 0021. Con anon y Cliente, comprobar que propiedades, imágenes e historial solo devuelven columnas permitidas; los campos privados y los IDs de actor deben dar error de permiso al seleccionarlos directamente. Confirmar que `property_private_details` no se lee como anon/Cliente; Admin y agente activo asignado leen solo dirección, código postal y coordenadas exactas, sin columnas de actor/timestamps. Agente no asignado y suspendido deben quedar bloqueados. Verificar alta/edición Admin, mapa, búsqueda por radio e imágenes con columnas reducidas.
- El usuario informa que 0021 parece funcionar. La matriz anterior aún requiere evidencia por identidad y pruebas directas de columnas/permisos.

## Fase 14 — Navegación responsive, incremento 5

- Revisión manual pendiente en escritorio, tablet y móvil: barra centrada, cuatro enlaces principales, desplegable móvil, menú de perfil con opciones por rol, cierre con Escape/click exterior y al navegar, tema y cierre de sesión.
- Confirmar que tocar una ruta en móvil inicia navegación y cierra el panel al cambiar de ruta; mostrar indicador inmediato y cargar contenido final. La sesión actual no pudo acceder al navegador local, así que solo se verificaron lint y tipos.

## Verificaciones ejecutadas en Fase 3

- `pnpm lint`: pasa.
- `pnpm typecheck`: pasa.
- Parseo PostCSS de los archivos CSS de la aplicación y tokens: pasa.
- Smoke checks de defaults sin límites, filtros, orden por precio, paginación y resultado vacío: pasan.
- `pnpm build`: no completó dentro del sandbox porque Turbopack intenta enlazar un puerto local y el sistema responde `Operation not permitted`; debe repetirse en la terminal local de Arch.
- Revisión visual de las rutas nuevas: pendiente hasta disponer del build/dev server local.
