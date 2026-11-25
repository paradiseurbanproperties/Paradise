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
- MapLibre GL JS está en `package.json`; el usuario reporta habilitar PostGIS. El usuario confirmó la firma de la RPC de `supabase/migrations/202611230005_geospatial_search.sql`; una llamada anónima real y lectura de catálogo respondieron HTTP 200 con una fila. Falta validar búsqueda por radio en la interfaz.
- El usuario reporta que el enlace de verificación de correo ahora funciona; no se verificó Auth remoto desde esta sesión.
- Fase actual: Fase 14 — Seguridad y rendimiento. El usuario reporta que nombre/SEO de Fase 13 funciona, pero correo/teléfono no guardaban; el upsert se corrigió localmente omitiendo la llave `singleton`. No repetir migraciones anteriores.
- La página `/admin` quedó inicialmente bajo una carpeta con comillas literales y devolvía 404; se corrigió a `src/app/(admin)/admin/page.tsx`.
- El usuario confirma que tracking, gráfica diaria, ranking, selector 7/28/90, desgloses por tipo/ciudad y CSV funcionan; Fase 9 queda validada funcionalmente por ese reporte.
- El usuario confirma CRM completo; se considera 0013 funcional según su reporte, aunque esta sesión no inspeccionó el historial remoto.
- El usuario confirma que favoritos, comparación, listas e historial de actividad funcionan; 0014–0016 se consideran validadas por su reporte, sin inspección directa del historial remoto.
- Fase 12 implementa `/notificaciones` para avisos Premium y cambios CRM con contador no leído. El usuario confirma su funcionamiento; 0017 se considera validada según ese reporte.
- Fase 13: SEO técnico y `/admin/configuracion` están implementados; el usuario confirma funcionamiento de 0018. No se inspeccionó Supabase remoto.
- Fase 14: el usuario confirma que RLS está aprobado y también confirma hamburguesa, tema, perfil y mapa al 100% en Vercel. No se inspeccionó la matriz remota de manera independiente. La RPC geográfica anónima y la lectura de catálogo respondieron HTTP 200 con un resultado cada una; validar la búsqueda por radio en la interfaz. El contacto Admin se corrigió para respetar los grants de 0018; Auth usa dominios Vercel como fallback; propiedades aceptan centavos y el máximo de `numeric(14,2)`. Falta validación manual post-deployment y publicar la regla WAF.
- GitHub: `paradiseurbanproperties/Paradise`, rama `main`, commits subidos hasta `7c61e2b`. Tras añadir `vercel.json` con `framework: nextjs`, Vercel terminó el deployment y `https://paradise-kappa-gray.vercel.app/` responde HTTP 200 con `x-matched-path: /`. El 404 está resuelto.
- La revisión móvil se considera resuelta según confirmación del usuario; no se ha confirmado por separado Android.
- Por instrucción del usuario, no hacer push a GitHub hasta recibir autorización explícita.
- `pnpm lint` y `pnpm typecheck` pasan; no se ejecutaron pruebas de producto ni se consultó Supabase remoto.
- El build con Turbopack ha fallado en este sandbox al crear un proceso/enlazar un puerto (`Operation not permitted`); `pnpm lint` y `pnpm typecheck` sí han pasado en el incremento de mapas.
