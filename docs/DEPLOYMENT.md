# Despliegue y operación

**Estado:** Paradise está desplegado en Vercel y el usuario confirma la experiencia móvil. El commit `554b45c` (documentación posterior al código de `5a958f2`) pasó CI y Vercel; `/registro` responde HTTP 200. Lighthouse móvil de `/` dio 99 en rendimiento y 100 en las otras categorías; ver `docs/PERFORMANCE.md`. Backups, monitorización y dominio propio no constan configurados/verificados.

## Vercel — destino solicitado

El proyecto usa Next.js App Router y `pnpm-lock.yaml`. `vercel.json` fija `framework: "nextjs"` para que Vercel genere el manifiesto de rutas Next aunque el preset del dashboard haya quedado en “Other”; no define rewrites ni output personalizado. El script `pnpm build` ejecuta `next build --webpack`: se fijó Webpack porque la build completa pasó con ese modo; Turbopack no pudo enlazar un puerto en este entorno de desarrollo. Node.js mínimo `20.9.0` está declarado en `package.json`. Cada push a `main` genera despliegues una vez conectado el repo. Revisar build logs y abrir el deployment Preview antes de considerarlo validado.

Variables que deben configurarse en Vercel para Production y Preview según corresponda:

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave publicable (nunca service role).
- `NEXT_PUBLIC_SITE_URL`: origen canónico HTTPS que alimenta metadatos, sitemap y canonical. Para Production, asignar el dominio Vercel definitivo. Auth y las APIs públicas usan esta URL y, si falta, el dominio de producción o deployment que Vercel expone automáticamente.
- Opcional: `NEXT_PUBLIC_MAP_STYLE_URL` o `NEXT_PUBLIC_MAP_TILE_URL`; si faltan, el mapa usa teselas raster OSM. Configurar límites/condiciones de un proveedor antes de tráfico significativo.
- `GEOCODING_PROVIDER` y `GEOCODING_API_KEY` solo si se habilita geocodificación; la clave debe ser server-side y no llevar prefijo `NEXT_PUBLIC_`.

En Supabase Auth → URL Configuration, establecer **Site URL** al dominio canónico, por ejemplo `https://paradise-kappa-gray.vercel.app`, y agregar `https://paradise-kappa-gray.vercel.app/auth/callback` a **Redirect URLs** (además de `http://localhost:3000/auth/callback` en desarrollo). Si se usan Preview URLs, permitir solo los patrones de preview requeridos. Supabase ignora `redirectTo` si su URL no coincide con la lista permitida; conservar `{{ .ConfirmationURL }}` en las plantillas estándar o usar las plantillas SSR descritas abajo. `{{ .RedirectTo }}` por sí solo no verifica el token. No copiar `.env.local` a GitHub ni a Vercel como archivo; cargar las variables por Settings → Environment Variables. `.env.example` contiene solo marcadores.

Vercel detecta Next.js y ejecuta la build del proyecto por cada push según su configuración estándar. Fuente: [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [builds](https://vercel.com/docs/builds) y [variables de entorno](https://vercel.com/docs/environment-variables/framework-environment-variables).

### Rate limit para endpoints públicos

El formulario de consulta usa `POST /api/crm/property-inquiry`; analítica usa `POST /api/analytics/property-view`. Ambos validan `Origin`, JSON y tamaño del body. CRM añade además honeypot y un límite SQL de tres envíos por correo/propiedad/hora.

**Estado actual:** por decisión del usuario, no se habilita esta regla debido al costo potencial. Se mantiene esta configuración como referencia opcional si se reconsidera. Los límites actuales de aplicación no son globales por IP: el CRM limita por correo/propiedad y analítica por sesión.

La configuración y el costo de esta función pueden cambiar; consultar [rate limiting de Vercel](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) y [Firewall API](https://vercel.com/docs/vercel-firewall/firewall-api) antes de activarla. La regla no está habilitada.

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
- CI local en `.github/workflows/quality.yml`: instalación reproducible, tipos, lint, unitarias, build e E2E. Falta el primer resultado remoto tras un push autorizado; la integración real con Supabase/RLS no está dentro del workflow.

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

## Recuperación y confirmación SSR

El callback admite códigos PKCE y tokens `token_hash` con tipo `recovery`, `email` o `signup`. `/auth/confirm` comparte el manejador. Los enlaces PKCE estándar requieren abrir el correo en el mismo navegador y dominio que solicitó el enlace; un navegador distinto no dispone de la cookie verificadora.

Para permitir abrir el correo en otro navegador, copiar `supabase/templates/recovery.html` a Auth → Email Templates → Reset Password y `supabase/templates/confirmation.html` a Confirm signup. Los enlaces llaman `verifyOtp` en el servidor y guardan la sesión mediante cookies. Estas plantillas no se aplican automáticamente mediante GitHub/Vercel. Mantener `Site URL` en el dominio público canónico y `NEXT_PUBLIC_SITE_URL` de Vercel Production en el mismo origen. Solicitar un correo nuevo tras guardar; los correos anteriores no cambian.

La comprobación HTTP del 24 de noviembre encontró `paradise-paradise-0f94.vercel.app` redirigiendo al SSO de Vercel, mientras `paradise-kappa-gray.vercel.app` respondió 200. No usar un dominio protegido como destino público de Auth. No se dispone de acceso administrativo a Supabase/Vercel para modificar URLs, SMTP o plantillas desde esta sesión.

Los errores de recuperación y actualización registran únicamente código/estado. Si no llegan correos, revisar Auth logs y SMTP: un cambio de callback no soluciona un proveedor de correo rechazado o limitado. No se ha verificado entrega real a un inbox.

Registro y recuperación solicitan exactamente `/auth/callback` sin `next` para coincidir con la entrada exacta de Redirect URLs. Supabase conserva la intención recovery en el verificador PKCE; el callback usa esa información para dirigir al formulario. Referencia de comparación de URLs: https://github.com/supabase/auth/blob/master/internal/utilities/request.go.
