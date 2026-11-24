# Despliegue y operación

**Estado:** guía de decisiones futuras; no existe despliegue configurado. No hay backups, monitorización, CI, dominios ni servicios operativos verificados.

## Vercel — destino solicitado

El proyecto usa Next.js App Router y `pnpm-lock.yaml`. `vercel.json` fija `framework: "nextjs"` para que Vercel genere el manifiesto de rutas Next aunque el preset del dashboard haya quedado en “Other”; no define rewrites ni output personalizado. El script `pnpm build` ejecuta `next build --webpack`: se fijó Webpack porque la build completa pasó con ese modo; Turbopack no pudo enlazar un puerto en este entorno de desarrollo. Node.js mínimo `20.9.0` está declarado en `package.json`. Cada push a `main` genera despliegues una vez conectado el repo. Revisar build logs y abrir el deployment Preview antes de considerarlo validado.

Variables que deben configurarse en Vercel para Production y Preview según corresponda:

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave publicable (nunca service role).
- `NEXT_PUBLIC_SITE_URL`: origen canónico HTTPS que alimenta metadatos, sitemap, canonical y redirects. Para Production, asignar el dominio Vercel definitivo; para Preview, usar el origen de preview si se desea que canonical/redirect sean específicos de esa vista.
- Opcional: `NEXT_PUBLIC_MAP_STYLE_URL` o `NEXT_PUBLIC_MAP_TILE_URL`; si faltan, el mapa usa teselas raster OSM. Configurar límites/condiciones de un proveedor antes de tráfico significativo.
- `GEOCODING_PROVIDER` y `GEOCODING_API_KEY` solo si se habilita geocodificación; la clave debe ser server-side y no llevar prefijo `NEXT_PUBLIC_`.

En Supabase Auth, añadir el dominio de producción y las URLs Preview necesarias a Redirect URLs para `/auth/callback`; confirmar el dominio público del proyecto en Site URL/Auth y validar email/recovery links. No copiar `.env.local` a GitHub ni a Vercel como archivo; cargar las variables por Settings → Environment Variables. `.env.example` contiene solo marcadores.

Vercel detecta Next.js y ejecuta la build del proyecto por cada push según su configuración estándar. Fuente: [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [builds](https://vercel.com/docs/builds) y [variables de entorno](https://vercel.com/docs/environment-variables/framework-environment-variables).

### Diagnóstico de 404

- La raíz del repositorio contiene `package.json` y la ruta `/` está en `src/app/(public)/page.tsx`; el build local confirma que `/` forma parte de las rutas generadas.
- En Vercel usar `Production Branch: main` y `Root Directory` en la raíz del repositorio (campo vacío o `./`). Dejar `Output Directory` sin sobrescribir; no usar `/main`, `public` ni `.next` como salida de una app Next.js.
- Revisar que `Framework Preset` sea `Next.js`, que el deployment marcado como Production corresponda al commit `main` y abrir su dominio `.vercel.app` directamente en `/`.
- La URL `https://paradise-kappa-gray.vercel.app/` respondió HTTP/2 404, `server: Vercel`, `x-vercel-error: NOT_FOUND` (PoP SFO). GitHub marca deployment completado para el commit anterior y el build local incluye `/`.
- Causa compatible con evidencia: Vercel puede completar el build con preset “Other” pero no generar el manifiesto de rutas Next. Se añadió `vercel.json` para forzar el preset `nextjs`; el push siguiente debe crear un deployment nuevo.
- Si persiste tras el redeploy, confirmar `Root Directory` en la raíz, `Output Directory` predeterminado, Framework Next.js y que el dominio esté asignado a ese proyecto/deployment; Vercel recomienda revisar el manifiesto/routing settings y logs.
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
