# Paradise — Plataforma Inmobiliaria

Plataforma inmobiliaria modular en planeación para un ejercicio académico. El objetivo es administrar propiedades y publicaciones, clientes, agentes, CRM, visitas, suscripciones Premium simuladas, analítica y configuración desde una experiencia pública y paneles con permisos.

> **Estado:** Fase 15 (QA y entrega) en curso. El usuario confirma RLS aprobado; no se inspeccionó la matriz remota de forma independiente. Fase 15 incluye 15 unitarias y 5 E2E Chromium; axe analiza páginas públicas, registro, estados oscuro y controles móviles sin violaciones en las corridas actuales. `pnpm test`, `pnpm test:e2e`, lint, typecheck y build pasan localmente; GitHub Actions y Vercel pasaron para la última versión. Dos muestras Lighthouse de la portada (móvil/escritorio) dieron rendimiento 99 y accesibilidad/buenas prácticas/SEO 100; no son datos de campo para validar INP/Core Web Vitals. Falta medir el catálogo, repetición y matriz remota por roles. El usuario reporta que móvil funciona al 100%. Por decisión del usuario, se omite el rate limit WAF de Vercel por costo; los límites de CRM/analítica son de aplicación y no cubren globalmente por IP. `public/icons/paradise.png` es la marca unificada para pestaña, vista previa, navbar y footer.

## Objetivos y problema

El proyecto busca reunir el catálogo público y los procesos internos de una inmobiliaria en un sistema coherente: búsqueda de propiedades, seguimiento de interesados, coordinación de visitas y administración de publicaciones. También sirve para presentar una arquitectura de software con módulos, base de datos relacional, control de acceso y documentación verificables.

## Tecnologías propuestas

- Next.js 16.x App Router, React 19.3, TypeScript y Tailwind CSS 4.3.
- Supabase PostgreSQL, Auth y Storage; PostGIS para búsquedas geográficas cuando esté disponible.
- MapLibre GL JS y OpenStreetMap; proveedor de geocodificación configurable.
- Zod, React Hook Form cuando aporte valor, Recharts, Lucide.
- Vitest, React Testing Library, Playwright, ESLint y Prettier.

Versiones fijadas en `package.json` y lockfile: Next.js 16.3.0, React/React DOM 19.3.0, TypeScript 5.9.x, Tailwind CSS 4.3.0, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.119.2 y Zod 4.6.7. Node.js local 26.13.1 y pnpm 12.19.0. La guía Supabase para Next recomienda el patrón SSR con cookies y clientes separados [servidor/navegador](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&package-manager=npm&queryGroups=framework&queryGroups=package-manager); se usa `proxy.ts` para refrescar sesión en Next 16. La configuración de correo y URL de retorno de Auth es externa.

El destino solicitado es Vercel conectado al repositorio GitHub `paradiseurbanproperties/Paradise`. `vercel.json` fija el framework Next.js; los valores Supabase y `NEXT_PUBLIC_SITE_URL` deben configurarse por ambiente en Vercel, como se detalla en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). El repo no contiene `.env.local`.

## Arquitectura

Se propone un monolito modular de Next.js: App Router organiza rutas y layouts por audiencia; `features/` concentra módulos de producto; servicios contienen casos de uso; repositorios aíslan consultas; Zod centraliza validación; componentes compartidos viven fuera de los módulos. Las comprobaciones de permisos se hacen en servidor y PostgreSQL RLS restringe cada operación como defensa adicional.

El diseño de módulos y estructura está en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). El esquema inicial y sus relaciones están en [docs/DATABASE.md](docs/DATABASE.md).

## Módulos previstos e implementación actual

Catálogo y detalle de propiedades; búsqueda y mapas; autenticación y perfiles; favoritos y listas; comparación; solicitudes de visita; historial de actividad y precios; suscripciones Premium con pago simulado; agentes y CRM; panel administrativo; analítica, auditoría, exportaciones y configuración general.

### Estado implementado del catálogo

La experiencia pública incluye portada con búsqueda, tarjetas, filtros, ordenamiento, paginación, fichas con mapa cuando la propiedad tiene coordenadas y una vista `/propiedades/mapa`. Si Supabase no está configurado se usan ejemplos ficticios etiquetados; si está configurado, se consultan publicaciones aprobadas y un inventario vacío no se sustituye por anuncios ficticios. Las fichas viven en Postgres; cada foto tiene registro en `property_images` y su archivo binario se almacena en el bucket privado de Supabase Storage, vinculado por ruta y FK. El historial transaccional de precios de la migración 0004 ya fue probado por el usuario. Mapas sincroniza resultados por radio usando PostGIS; la migración 0005 consta aplicada según consulta del usuario; el mapa no inventa coordenadas para propiedades sin ubicación guardada.

## Diseño funcional previsto

### Propiedades y geolocalización

El catálogo paginado filtrará por ubicación, precio, tipo, características, estado y visibilidad. Una ficha tendrá galería, características, ubicación, agente, contacto, visitas e historial de precio. Las publicaciones deben estar aprobadas y activas antes de aparecer. El mapa se apoyará en MapLibre/OpenStreetMap y en un proveedor de geocodificación configurable; consultas por radio/área usarán PostGIS si está disponible. No habrá compra de propiedades desde la plataforma.

### Cuentas, perfiles y acceso

Supabase Auth gestiona identidad. El perfil mantiene rol base Cliente, Agente o Admin; Premium se determina por suscripción activa y vigente. El servidor autoriza cada acción y RLS protege los registros por usuario, asignación o alcance administrativo. Preferencias de tema quedan locales para visitantes y sincronizadas al perfil autenticado.

En Fase 4 se crearon pantallas `/login`, `/registro`, `/recuperar-password`, `/verificar-email` y `/auth/cambiar-password`, acciones de servidor y callback PKCE. La configuración pública de Supabase confirma que el registro por email está habilitado y requiere verificación; una nueva cuenta no puede iniciar sesión hasta confirmar el mensaje recibido. La pantalla registra en servidor solo el código/estado de errores de alta para diagnóstico, sin datos personales. El usuario reporta que los enlaces de verificación funcionan; el flujo de alta con un inbox nuevo requiere una prueba real. En Fase 5 se añadieron roles cliente/admin/agente, estados activos/suspendidos, guardas server-side, navegación con sesión, `/mi-cuenta` y `/admin/usuarios` para gestionar acceso y ver auditoría; el usuario reporta aplicar la migración y designar el primer Admin. El usuario confirma que RLS quedó aprobado; no se reprodujo aquí la matriz por identidad.

Fase 6 conecta el catálogo con Supabase y su panel Admin para gestionar fichas, características, fotografías, moderación e historial de precio. El usuario confirmó que el flujo completo funciona al 100%. Fase 7 integra selección de coordenadas con MapLibre en Admin y mapas en la ficha pública; el usuario confirma que estos mapas se muestran. La RPC geográfica y la lectura anónima de catálogo respondieron HTTP 200 con una ficha; falta confirmar la búsqueda desde la interfaz. Fase 8 añade planes y checkout simulado en `/premium`, historial, cancelación por RPC y `/admin/suscripciones`. El usuario confirma que el flujo Premium completo funciona.

### Herramientas del cliente

Clientes pueden guardar favoritos, organizarlos en listas propias, comparar hasta cuatro propiedades y consultar su actividad. Solicitudes de visita siguen pendientes. El historial personal conserva consultas a fichas, favoritos y consultas CRM, con límite de 500 eventos por cuenta; el usuario confirma que funciona. Las visitas no reservan ni compran una propiedad. El historial de precio registra actor, fecha, valor anterior/nuevo y motivo opcional mediante operación atómica.

### Premium simulado

Planes tendrán precio y duración configurables. El flujo de pago será ficticio, con resultados de éxito/rechazo generados en servidor; no recibirá datos de tarjeta ni transferirá dinero. El sistema distinguirá suscripción activa/vencida/cancelada/pendiente de cualquier ingreso real. Propiedades Premium y distintivos dependerán de la suscripción validada.

### Agentes, CRM y administración

Fase 10 incluye perfiles profesionales moderados en `/admin/agentes` y directorio público `/agentes`, con páginas individuales. El usuario confirma perfiles, asignaciones, cartera y CRM; se considera 0013 funcional por su reporte, sin inspección directa del historial remoto. Las fichas de propiedades reales disponibles aceptan consultas; `/admin/leads` y `/agente/leads` presentan el tablero por etapa, cambios con historial y notas internas. No hay perfiles ficticios; contacto y notas son privados. Visitas y disponibilidad siguen pendientes.

### Herramientas del cliente

`/favoritos` permite a un Cliente consultar y retirar propiedades guardadas; el control también está disponible en el catálogo y las fichas. El usuario confirma favoritos, comparación, listas y actividad; 0014–0016 se consideran validadas según su reporte, sin verificación remota directa. `/comparar` contrasta hasta cuatro propiedades visibles, con selección guardada en el navegador local. `/favoritos/listas` permite crear, renombrar y borrar colecciones, y añadir/quitar propiedades guardadas. `/mi-actividad` muestra vistas, cambios de favoritos y consultas enviadas con eventos minimizados.

### Notificaciones

`/notificaciones` muestra avisos in-app al Cliente cuando cambia el estado de una suscripción Premium o avanza una consulta CRM. Los triggers guardan eventos transaccionales; el usuario puede marcar avisos individuales o todos como leídos. El usuario confirma el flujo; 0017 se considera validada según su reporte, sin inspección remota directa. No se envían correos ni SMS.

### Configuración y SEO

`/admin/configuracion` permite a Admin definir nombre, frase, descripción SEO y contacto público. La migración 0018 define lectura pública y escrituras solo de Admin activo; correo y teléfono no se publican hasta que se capturen datos confirmados. Se corrigió el payload de upsert de contacto para respetar los grants de la llave singleton; falta confirmar el guardado en el deployment. Los metadatos raíz, sitemap XML, robots y canonical usan el dominio `NEXT_PUBLIC_SITE_URL`; las áreas privadas llevan `noindex`.

### Privacidad de inmuebles

La migración 0021 mueve dirección, código postal, coordenadas exactas y actores de creación/aprobación a `property_private_details`, visible solo para Admin y agente asignado. Los grants limitan esa tabla a los campos que necesita el panel, sin IDs de actores ni timestamps internos. La tabla pública conserva una coordenada redondeada y los grants excluyen columnas internas de propiedades, fotografías e historial de precio. El usuario indica que parece funcionar; la matriz independiente por rol sigue pendiente.

### Analítica y privacidad

El tracking implementado cuenta una vista por propiedad, pestaña y día con un UUID aleatorio temporal. No persiste IP, usuario, navegador, referente ni búsqueda; limita 30 propiedades por sesión y día y elimina eventos tras 90 días. El usuario confirma que tracking, ranking, filtros, CSV y desgloses 0010 funcionan. El precio de una propiedad vendida no será ingreso de la plataforma; los pagos Premium simulados se reportarán aparte.

## Datos y roles

Supabase Auth será la identidad. `profiles` guardará datos de aplicación y rol base (`cliente`, `agente`, `admin`); Premium se determinará por una suscripción vigente, no por un rol asignable. Las entidades de dominio se enlazan con UUID y claves foráneas. Las políticas previstas se describen en [docs/SECURITY.md](docs/SECURITY.md).

## Seguridad y límites

No se aceptan roles ni estado Premium enviados por el cliente como autoridad. Las acciones privilegiadas se ejecutan en servidor, la clave `service_role` no se publica, y las políticas RLS limitan propiedad de datos y asignaciones. El pago Premium será ficticio: no se recogen tarjetas ni se procesan fondos. El CI está definido localmente pero aún no se ha ejecutado en GitHub; backups y monitorización no están configurados ni se consideran operativos.

La matriz de roles, reglas de publicación, protección de CRM, Storage, auditoría y límites conocidos está en [docs/SECURITY.md](docs/SECURITY.md). La propuesta de esquema normalizado y relaciones está en [docs/DATABASE.md](docs/DATABASE.md).

## Instalación y ejecución

Instala dependencias en Arch:

```bash
pnpm install
pnpm dev
```

Luego copia `.env.example` a `.env.local` y añade la URL y publishable key reales de Supabase. No compartas secretos en el chat ni subas `.env.local` a Git. En Supabase Auth agrega `http://localhost:3000/auth/callback` en Redirect URLs. Para aplicar migraciones, sigue el orden indicado en [supabase/README.md](supabase/README.md). Para producción, configura un proveedor de correo. Las variables y marcadores están en [.env.example](.env.example).

Para producción configura también `NEXT_PUBLIC_SITE_URL` con el origen HTTPS canónico del sitio; sitemap, robots y enlaces canónicos dependen de ese valor.

## Pruebas

La estrategia incluye pruebas unitarias, integración de repositorios/RLS y E2E. Consulta [docs/TESTING.md](docs/TESTING.md). Ejecuta `pnpm test` para Vitest; para E2E, primero `pnpm build` y después `pnpm test:e2e`, que usa Chromium y axe. La matriz RLS automatizada y el perfil Lighthouse/Web Vitals siguen pendientes.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Base de datos](docs/DATABASE.md)
- [Seguridad y RLS](docs/SECURITY.md)
- [API propuesta](docs/API.md)
- [Despliegue](docs/DEPLOYMENT.md)
- [Estrategia de pruebas](docs/TESTING.md)
- [Rendimiento Lighthouse y Web Vitals](docs/PERFORMANCE.md)
- [Presentación académica](docs/PRESENTATION.md)
- [Registro de avance](PROGRESO.txt)
- [Guía de continuidad para agentes de código](AGENTS.md)
- [Cambios](CHANGELOG.md)
- [Contribución](CONTRIBUTING.md)

## Estado y alcance

El desarrollo se realizará en las 16 fases descritas en `PROGRESO.txt`. La Fase 6 está cerrada funcionalmente; la Fase 7 tiene la interfaz y consulta geoespacial implementadas, pendientes de validación en Supabase. Con Supabase configurado, el catálogo consulta los inmuebles persistidos y no presenta ejemplos si no hay propiedades aprobadas.
