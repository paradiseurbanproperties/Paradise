# Guía para agentes de código — Paradise

## Al retomar una sesión

1. Lee `PROGRESO.txt` primero: es la fuente del estado confirmado y la siguiente tarea.
2. Lee `README.md` y luego las secciones pertinentes de `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/TESTING.md` y `supabase/README.md`.
3. Inspecciona el código, las migraciones y `git status`; no deduzcas que una migración remota se aplicó solo porque existe en el repositorio.
4. Distingue lo probado por el usuario, lo que reporta haber configurado y lo que se verificó en esta sesión. Nunca inventes resultados.
5. Continúa desde `PRÓXIMA ACTIVIDAD` en `PROGRESO.txt`. Respeta las fases autorizadas; no saltes módulos por iniciativa propia.

## Reglas del proyecto

- Paradise es una plataforma inmobiliaria en español, desarrollada por fases para un proyecto académico con arquitectura de producto real.
- Stack vigente: Next.js App Router, React, TypeScript, Tailwind CSS, Supabase (PostgreSQL/Auth/Storage), MapLibre y pnpm. Verifica las versiones en `package.json`.
- Mantén lógica de negocio en `src/features`, páginas principalmente de composición y consultas en repositorios de servidor.
- Valida datos en servidor, verifica permisos en servidor y conserva RLS como segunda barrera. Nunca expongas `service_role` ni confíes en roles o estados enviados por el navegador.
- Cada inmueble y metadata de imágenes se guarda en Postgres; los binarios de fotos viven en Supabase Storage del mismo proyecto.
- Premium es una suscripción de cliente, no un rol. La pasarela Premium es completamente ficticia: no aceptar ni almacenar tarjeta, CVV o datos bancarios reales.
- No uses estadísticas o publicaciones ficticias como si fueran reales. Los datos demo actuales deben estar identificados.
- No instales dependencias sin necesidad. Cuando el entorno aislado falle por red, registra el comando exacto para Arch y continúa el trabajo independiente.
- No afirmes que los servicios externos, backups, monitorización o despliegues están operativos sin verificarlos.

## Documentación obligatoria

Después de cada avance significativo actualiza `PROGRESO.txt`, `CHANGELOG.md` y la documentación temática afectada. Registra estado, archivos, validación, errores, dependencias externas y siguiente acción. No marques una función completa hasta que haya sido probada o el usuario confirme su funcionamiento.

## Estado de relevo anotado el 2026-11-24

- El usuario confirma Fase 6 (CRUD de propiedades, fotografías, publicación e historial de precios) funcional al 100%.
- El usuario confirma que el mapa ya se ve en administración y en el detalle público después de añadirlo allí.
- MapLibre GL JS está en `package.json`; el usuario reporta habilitar PostGIS. Una consulta ejecutada por el usuario confirma la columna geográfica y la RPC de `supabase/migrations/202611230005_geospatial_search.sql`; la búsqueda con datos reales está pendiente.
- El usuario reporta que el enlace de verificación de correo ahora funciona; no se verificó Auth remoto desde esta sesión.
- Fase actual: Fase 14 — Seguridad y rendimiento. El usuario confirma que configuración/SEO de Fase 13 funciona; 0018 se considera validada según su reporte, sin inspección remota. No volver a ejecutar migraciones anteriores.
- La página `/admin` quedó inicialmente bajo una carpeta con comillas literales y devolvía 404; se corrigió a `src/app/(admin)/admin/page.tsx`.
- El usuario confirma que tracking, gráfica diaria, ranking, selector 7/28/90, desgloses por tipo/ciudad y CSV funcionan; Fase 9 queda validada funcionalmente por ese reporte.
- El usuario confirma CRM completo; se considera 0013 funcional según su reporte, aunque esta sesión no inspeccionó el historial remoto.
- El usuario confirma que favoritos, comparación, listas e historial de actividad funcionan; 0014–0016 se consideran validadas por su reporte, sin inspección directa del historial remoto.
- Fase 12 implementa `/notificaciones` para avisos Premium y cambios CRM con contador no leído. El usuario confirma su funcionamiento; 0017 se considera validada según ese reporte.
- Fase 13: SEO técnico y `/admin/configuracion` están implementados; el usuario confirma funcionamiento de 0018. No se inspeccionó Supabase remoto.
- Fase 14: el usuario confirma asignación/revocación y auditoría tras 0019–0020, y reporta que 0021 parece funcionar, sin inspección remota. La captura móvil más reciente muestra menú/tema/perfil inertes y MapLibre en carga; tratar como posible fallo de bundles/hidratación compartido, revisar Network/Console desde el dispositivo antes de atribuir a Safari. El icono `PARADISE.png` se configuró como favicon/apple touch/preview social. El endpoint de vistas valida Origin con `NEXT_PUBLIC_SITE_URL`; faltan matriz RLS y mitigación anti-abuso.
- `pnpm lint` y `pnpm typecheck` pasan; no se ejecutaron pruebas de producto ni se consultó Supabase remoto.
- El build con Turbopack ha fallado en este sandbox al crear un proceso/enlazar un puerto (`Operation not permitted`); `pnpm lint` y `pnpm typecheck` sí han pasado en el incremento de mapas.
