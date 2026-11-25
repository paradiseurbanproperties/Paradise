# Despliegue y operación

**Estado:** Paradise está desplegado en Vercel y el usuario confirma la experiencia móvil. Esta sesión no verificó el estado del deployment tras los cambios locales. Backups, monitorización, CI y dominio propio no constan configurados/verificados.

## Vercel — destino solicitado

El proyecto usa Next.js App Router y `pnpm-lock.yaml`. `vercel.json` fija `framework: "nextjs"` para que Vercel genere el manifiesto de rutas Next aunque el preset del dashboard haya quedado en “Other”; no define rewrites ni output personalizado. El script `pnpm build` ejecuta `next build --webpack`: se fijó Webpack porque la build completa pasó con ese modo; Turbopack no pudo enlazar un puerto en este entorno de desarrollo. Node.js mínimo `20.9.0` está declarado en `package.json`. Cada push a `main` genera despliegues una vez conectado el repo. Revisar build logs y abrir el deployment Preview antes de considerarlo validado.

Variables que deben configurarse en Vercel para Production y Preview según corresponda:

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave publicable (nunca service role).
- `NEXT_PUBLIC_SITE_URL`: origen canónico HTTPS que alimenta metadatos, sitemap y canonical. Para Production, asignar el dominio Vercel definitivo. Los callbacks de Auth usan esta URL y, si falta, el dominio de producción o deployment que Vercel expone automáticamente.
- Opcional: `NEXT_PUBLIC_MAP_STYLE_URL` o `NEXT_PUBLIC_MAP_TILE_URL`; si faltan, el mapa usa teselas raster OSM. Configurar límites/condiciones de un proveedor antes de tráfico significativo.
- `GEOCODING_PROVIDER` y `GEOCODING_API_KEY` solo si se habilita geocodificación; la clave debe ser server-side y no llevar prefijo `NEXT_PUBLIC_`.

En Supabase Auth → URL Configuration, establecer **Site URL** al dominio canónico, por ejemplo `https://paradise-kappa-gray.vercel.app`, y agregar `https://paradise-kappa-gray.vercel.app/auth/callback` a **Redirect URLs** (además de `http://localhost:3000/auth/callback` en desarrollo). Si se usan Preview URLs, permitir solo los patrones de preview requeridos. Supabase ignora `redirectTo` si su URL no coincide con la lista permitida; usar `{{ .RedirectTo }}` en templates personalizados de confirmación y recuperación. No copiar `.env.local` a GitHub ni a Vercel como archivo; cargar las variables por Settings → Environment Variables. `.env.example` contiene solo marcadores.

Vercel detecta Next.js y ejecuta la build del proyecto por cada push según su configuración estándar. Fuente: [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [builds](https://vercel.com/docs/builds) y [variables de entorno](https://vercel.com/docs/environment-variables/framework-environment-variables).

### Rate limit para endpoints públicos

El formulario de consulta usa `POST /api/crm/property-inquiry`; analítica usa `POST /api/analytics/property-view`. Ambos validan `Origin`, JSON y tamaño del body. CRM añade además honeypot y un límite SQL de tres envíos por correo/propiedad/hora.

Crear en Vercel → proyecto → Firewall una regla WAF de Rate Limit con método `POST` y dos grupos de ruta (unidos por OR): cada endpoint anterior. Como valor inicial, usar ventana fija de 60 segundos, 30 solicitudes por IP y respuesta 429. En el primer despliegue se puede dejar `Log`, revisar el tráfico y después publicar el límite. Esto combina las dos rutas en una sola regla y evita persistir IP en la base de Paradise. Rate Limit se activa en configuración Firewall del proyecto; las acciones de WAF por `routes` en `vercel.json` solo admiten challenge/deny, no limitación de tasa.

Según [la documentación WAF de Vercel](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), el rate limiting está disponible en todos los planes, Hobby incluye una regla, usa ventana fija y tiene una cuota de 1 millón de solicitudes permitidas; la tabla de precios muestra $0.50 por millón de solicitudes permitidas. Los contadores son regionales, de modo que tráfico repartido en regiones puede exceder el límite por región. Vercel procesa la IP como clave del firewall, pero la aplicación no la guarda. Se puede configurar por [Dashboard, Firewall API o CLI](https://vercel.com/docs/vercel-firewall/firewall-api); esta regla todavía no está habilitada.

### Diagnóstico de 404

- La raíz del repositorio contiene `package.json` y la ruta `/` está en `src/app/(public)/page.tsx`; el build local confirma que `/` forma parte de las rutas generadas.
- En Vercel usar `Production Branch: main` y `Root Directory` en la raíz del repositorio (campo vacío o `./`). Dejar `Output Directory` sin sobrescribir; no usar `/main`, `public` ni `.next` como salida de una app Next.js.
- Revisar que `Framework Preset` sea `Next.js`, que el deployment marcado como Production corresponda al commit `main` y abrir su dominio `.vercel.app` directamente en `/`.
- La URL `https://paradise-kappa-gray.vercel.app/` respondió HTTP/2 404, `server: Vercel`, `x-vercel-error: NOT_FOUND` (PoP SFO). GitHub marca deployment completado para el commit anterior y el build local incluye `/`.
- Causa compatible con evidencia: Vercel puede completar el build con preset “Other” pero no generar el manifiesto de rutas Next. Se añadió `vercel.json` para forzar el preset `nextjs`.
- Tras el push de `vercel.json`, el deployment terminó y la misma URL respondió HTTP/2 200 con `x-matched-path: /` y `x-powered-by: Next.js`. El 404 quedó resuelto al fijar el framework Next.js.
- Próxima verificación funcional: abrir la web y comprobar navegación/interacciones desde iOS y Android. Si reaparece un 404 en otra URL, confirmar `Root Directory` en la raíz, `Output Directory` predeterminado y asignación del dominio al proyecto/deployment; Vercel recomienda revisar el routing y logs.
- Referencia: [diagnóstico oficial de 404 en Vercel](https://vercel.com/kb/guide/why-is-my-deployed-project-giving-404) y [Root Directory/build settings](https://vercel.com/docs/builds/configure-a-build).

## Componentes previstos

- Aplicación Next.js en un runtime compatible con la versión elegida.
- Supabase gestionado para PostgreSQL/Auth/Storage, con migraciones versionadas y separación entre desarrollo y producción.
- Proveedor de mapas/teselas y geocodificación seleccionado según atribución, límites, privacidad y costo.
- CI para instalación reproducible, tipos, lint, unitarias, integración y build cuando existan esos comandos.

## Configuración y secretos

Completar `.env.example` al iniciar implementación. Las variables `NEXT_PUBLIC_*` son visibles al cliente y solo deben contener URL/clave publicable. `SUPABASE_SERVICE_ROLE_KEY` y credenciales de geocodificación privada permanecen solo en entorno de servidor/CI. No subir archivos `.env.local` ni secretos a logs.

Configurar `NEXT_PUBLIC_SITE_URL` con el origen HTTPS canónico del despliegue (sin ruta). Esta variable alimenta `metadataBase`, canonical, sitemap y `robots.txt`; el valor local predeterminado apunta a `http://localhost:3000`.

## Antes de una publicación

1. Fijar Node.js y gestor de paquetes; instalar desde lockfile.
2. Aplicar migraciones revisadas en una base no productiva y probar políticas RLS.
3. Configurar URLs permitidas de Auth, callbacks, Storage y límites de carga.
4. Configurar dominio, HTTPS, headers de seguridad, CSP y variables del entorno de producción.
5. Ejecutar verificaciones definidas en `docs/TESTING.md` y una build reproducible.
6. Diseñar y comprobar backups/restauración, retención de logs, alertas y respuesta a incidentes antes de afirmar que existen.

Proveedor de hosting, presupuesto, región, estrategia de backups y monitorización quedan pendientes de una decisión posterior. No se desplegará como parte de Fase 0.

## Opción gratuita considerada para Next.js

Para este proyecto, Render es la opción inicial más simple fuera de Vercel: su [guía de Next.js](https://render.com/docs/deploy-nextjs-app) permite desplegar la aplicación completa como servicio Node, por ejemplo con `pnpm build` y `pnpm start`. El [plan gratuito](https://render.com/docs/free) duerme el servicio tras 15 minutos sin tráfico y el primer acceso puede tardar cerca de un minuto en despertarlo; sirve para demo/portafolio, pero no para exigir respuesta constante. Supabase seguiría alojando base, Auth y Storage. Esta es una recomendación revisada, no un despliegue configurado ni una garantía permanente de límites/precios.

La aplicación añade cabeceras base (`nosniff`, anti-framing, política de referente y permisos del navegador) desde `next.config.ts`. Antes de desplegar, revisar la política CSP con los proveedores de teselas/imagenes y añadir HSTS cuando el dominio HTTPS esté configurado.
