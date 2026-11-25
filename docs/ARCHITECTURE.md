# Arquitectura propuesta

**Estado:** Fases 0–3 y 6, 8–13 validadas funcionalmente según reportes del usuario. En Fase 14, el usuario confirma RLS aprobado; la sesión no inspeccionó de forma independiente cada identidad. Una llamada RPC anónima de proximidad y la lectura del catálogo respondieron HTTP 200 con un resultado; falta validar el flujo completo desde la interfaz. La navegación principal concentra rutas públicas y deja opciones de cuenta/rol en el menú de perfil. La comparación se mantiene local en el navegador. Premium vive en `features/subscriptions` y no es un rol.

## Identidad visual pública

Los tokens globales están en `src/styles/tokens.css`. La portada combina neutros de alto contraste con acentos verde jade, arcilla y arena; el bloque de herramientas usa un fondo bosque persistente en ambos temas y superficies translúcidas. Los controles mantienen estados de foco visibles. Los datos de inventario y conteos siguen viniendo del repositorio; no se agregan métricas de muestra como si fueran reales.

## Inventario de propiedades

`/admin/propiedades` administra todas las fichas con el mismo flujo de crear, editar, moderar, cargar fotografías y mantener características. Las doce filas existentes se integran al catálogo público, búsqueda geográfica, historial de visitas, actividad, favoritos, comparación y consultas CRM. La lógica de producto no clasifica propiedades por prefijos de slug ni por texto de descripción.

El repositorio carga publicaciones aprobadas desde Supabase y no sustituye un catálogo vacío o una conexión ausente con filas locales. La migración `202611250025_property_inventory_standardization.sql` transforma los slugs anteriores a URLs normales, limpia textos de sistema y conserva IDs y relaciones existentes. El usuario reporta que 0024 ya fue aplicada; 0025 está en el repositorio y aún no se ha aplicado en Supabase.

## Límites y responsabilidades

- `app/`: rutas, layouts y composición por audiencia; no contiene consultas complejas ni reglas de negocio.
- `features/<dominio>/`: casos de uso y componentes específicos del dominio. `services/` aplica reglas; `repositories/` traduce persistencia; `schemas/`, `types/`, `actions/`, `hooks/` y `components/` se crean según necesidad.
- `features/properties/`: tipos de propiedad, repositorio Supabase, reglas de filtro/orden/paginación y componentes de tarjetas/filtros.
- Dirección, código postal y coordenadas exactas viven en `property_private_details`; el catálogo recibe solo columnas permitidas y coordenadas redondeadas. RLS limita dirección y ubicación exacta a Admin y agente activo asignado.
- Persistencia objetivo: las fichas se almacenan en PostgreSQL (`properties`); cada imagen tiene metadata/ruta con FK en `property_images` y su archivo binario vive en Supabase Storage. No se almacenarán fotos en `bytea`; los permisos de Storage seguirán publicación, visibilidad y asignaciones.
- `lib/supabase/`: clientes diferenciados de navegador, servidor y operaciones administrativas; acceso administrativo solo en servidor.
- `lib/permissions/`: resolución de sesión, roles y reglas de acceso en servidor.
- `lib/validations/`, `security/`, `logging/`, `cache/`, `utilities/`: capacidades transversales pequeñas.
- `components/`: UI común sin reglas específicas del dominio.
- `components/motion/` y Motion for React: `MotionConfig` global respeta `prefers-reduced-motion`; las rutas App Router usan `motion/react-client` para SSR y revelados de scroll, mientras los controles interactivos usan `motion/react`. Priorizar `opacity`/`transform`, animar una sola vez al entrar y evitar transiciones de ruta que retarden la navegación.
- `styles/`: tokens de marca, tema claro/oscuro y estilos base.
- Los temas consumen tokens semánticos neutros. El objetivo es WCAG 2.2 AA: contraste de texto de al menos 4.5:1 (3:1 para texto grande) y contraste de 3:1 para componentes/bordes esenciales. La paleta actual alcanza texto principal 17.24:1/17.04:1 y texto secundario 6.11:1/9.52:1 en fondos claro/oscuro; bordes de controles 3.35:1/3.09:1.
- `supabase/migrations/`: cambios versionados de esquema, funciones y políticas; `seed.sql` solo con datos ficticios.
- `tests/`: unitarias, integración, E2E y fixtures sintéticos.

## Estructura objetivo

```text
.
├── .github/workflows/       # CI y pruebas
├── docs/                    # arquitectura, datos, seguridad, operación, exposición
├── public/{images,icons,logos,fonts}/
├── supabase/{migrations,seed.sql,config.toml}
├── src/
│   ├── app/
│   │   ├── (public)/        # inicio, propiedades, propiedad/[slug], agentes, premium, nosotros, contacto
│   │   ├── (auth)/          # login, registro, recuperar-password, verificar-email
│   │   ├── (client)/        # mi-cuenta, favoritos, listas, comparar, mis-visitas, actividad, configuración
│   │   ├── (agent)/agente/  # dashboard, propiedades, clientes, crm, visitas, mensajes, estadísticas
│   │   ├── (admin)/admin/   # dashboard, propiedades, usuarios, agentes, publicaciones, clientes,
│   │   │                    # suscripciones, pagos, visitas, analítica, reportes, auditoría,
│   │   │                    # reclamaciones, configuración
│   │   ├── api/             # Route Handlers para integraciones/endpoints necesarios
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   ├── components/{ui,layout,navigation,forms,tables,charts,maps,feedback}/
│   ├── features/{auth,users,properties,property-images,property-search,favorites,comparison,visits,subscriptions,simulated-payments,agents,crm,analytics,notifications,price-history,audit,reports,site-settings}/
│   ├── lib/{supabase,permissions,security,cache,logging,validations,utilities}/
│   ├── hooks/ contexts/ config/ constants/ styles/ types/
│   └── proxy.ts             # protección superficial/redirecciones; nunca sustituye autorización
├── tests/{unit,integration,e2e,fixtures}/
├── scripts/{setup,database,maintenance}/
└── documentación y archivos de control en raíz
```

Los grupos de rutas son una organización lógica; rutas y autorizaciones se verifican en servidor. Las páginas públicas de propiedades pueden ser renderizadas en servidor para SEO; interacciones de mapa, galerías y filtros se hidratan en componentes cliente puntuales.

## Flujo de solicitud

1. La ruta identifica audiencia y carga el caso de uso adecuado.
2. El servicio verifica identidad, rol y relación con el recurso.
3. Un esquema Zod valida entrada en el límite del servidor.
4. El repositorio ejecuta una consulta acotada mediante el cliente Supabase de usuario, para conservar contexto RLS.
5. RLS repite las restricciones sobre filas; respuestas se normalizan y errores se registran sin secretos ni datos sensibles.

Operaciones de administración que necesiten cliente privilegiado pasan por un servicio de servidor autenticado, con autorización explícita y auditoría. No se comparte cliente `service_role` con componentes cliente.

## Dependencias entre módulos

```text
Entorno y tokens
  └─ Auth + profiles + permisos/RLS
      ├─ Propiedades + imágenes + asignaciones + moderación
      │   ├─ Catálogo/detalle + SEO + mapas/búsqueda geográfica
      │   ├─ Historial de precios + auditoría
      │   ├─ Favoritos/listas + comparación + actividad
      │   ├─ Visitas + disponibilidad + notificaciones
      │   └─ Analítica de propiedades + paneles
      ├─ Suscripciones + simulación de pago
      │   └─ Entitlements Premium en catálogo/perfil/avatares
      ├─ Agentes + asignaciones
      │   └─ CRM + leads/interacciones + estadísticas
      └─ Configuración + exportaciones + reportes de administración
```

Identidad/roles y RLS son prerrequisito para módulos con datos privados; propiedades y asignaciones preceden catálogo, mapas, visitas, CRM y métricas. Suscripciones requieren identidad y planes y preceden restricciones Premium. El tracking de vistas usa una lista permitida de evento y permiso validado de publicación; su migración está pendiente de despliegue.

Fase 9 consulta agregados de tablas operativas bajo sesión Admin/RLS. El tracking de vistas se implementa mediante UUID efímero por pestaña, deduplicación diaria por propiedad, retención de 90 días y RPC agregadas Admin; no almacena IP ni identidad. El panel desglosa vistas por inmueble, tipo y ciudad. La exportación CSV reutiliza estas agregaciones en un Route Handler privado, sin exponer eventos crudos. El rango se filtra por una allowlist común de 7, 28 o 90 días.

Fase 10: `features/agents` administra perfiles, asignaciones y cartera. `features/crm` valida consultas, etapas y notas. El formulario público envía JSON al Route Handler `POST /api/crm/property-inquiry`, que valida origen, tamaño y honeypot antes de invocar la RPC SQL. `/admin/leads` y `/agente/leads` muestran un tablero por etapa y permiten añadir notas internas. El usuario confirma que CRM funciona; 0013 se considera funcional por su reporte, sin inspección del historial remoto.

Fase 7, módulo de visitas: Clientes autenticados proponen horarios desde una ficha disponible en `/mis-visitas`; el equipo gestiona solicitudes en `/agente/visitas` o `/admin/visitas`. RPC SQL autoriza cada transición, una advisory lock evita cruces por propiedad/agente y un trigger conserva los cambios. La migración 0024 está local; falta aplicarla y probar con sesiones distintas en Supabase.

Fase 11, incremento 1: `features/favorites` persiste favoritos por usuario y `features/comparison` conserva hasta cuatro IDs en `localStorage`, sin registrar datos de comparación en servidor. El usuario confirma que funcionan; 0014 se considera validada por su reporte.

Fase 11, incremento 2: `/favoritos/listas` y `/favoritos/listas/[id]` permiten gestionar listas propias y organizar favoritos. `favorite_lists` y `favorite_list_properties` usan RLS de Cliente activo propietario; el usuario confirma que funcionan y 0015 se considera validada por su reporte.

Fase 11, incremento 3: `features/activity` registra eventos minimizados de un Cliente autenticado: vista diaria, alta/baja de favorito y consulta enviada. `/mi-actividad` los presenta en cronología privada. `record_customer_activity` valida rol/estado y visibilidad, deduplica visitas por día UTC y conserva hasta 500 filas por cuenta. El usuario confirma que el historial funciona; 0016 se considera validada según su reporte.

Fase 12, incremento 1: `notifications` entrega avisos in-app al Cliente sobre activación/cancelación Premium y cambios de etapa CRM. Triggers guardan eventos dentro de las transacciones originales; `/notificaciones` permite marcar leídos y la navegación muestra el contador. RLS permite leer filas propias y cambiar únicamente `read_at`. La migración 0017 está pendiente.

Auth SSR utiliza `@supabase/ssr`: cliente de navegador, cliente servidor con cookies y `src/proxy.ts` para renovar tokens. Las acciones de Auth validan entradas con Zod y el callback intercambia el código PKCE por sesión o verifica `token_hash` de las plantillas SSR. `/auth/confirm` comparte ese manejador; el tipo recovery conduce al formulario de contraseña incluso si falta `next`. La autorización de Fase 5 se centraliza en `src/lib/permissions/access.ts`. Se consulta el rol desde servidor bajo RLS; las guardas requieren cuenta activa y ocultan rutas no autorizadas. La base valida cambios administrativos y no confía en metadata editable del cliente.

## Riesgos técnicos identificados

- **RLS incompleta o recursiva:** puede exponer filas o bloquear operaciones. Mitigación: grants mínimos, funciones auxiliares acotadas y pruebas con cada rol.
- **Autoridad de rol/entitlement:** claims desactualizados o metadata editable pueden otorgar permisos incorrectos. Mitigación: consultar fuentes controladas, no confiar en el cliente e invalidar caché al cambiar suscripción.
- **Citas concurrentes:** dos solicitudes pueden ocupar el mismo espacio. Mitigación: restricción de exclusión o RPC transaccional y prueba concurrente.
- **Privacidad de ubicación/contactos:** dirección y teléfono pueden ser datos personales. Mitigación: separar dirección interna de ubicación pública aproximada y minimizar eventos.
- **Servicios cartográficos:** límites, atribución y condiciones de terceros pueden cambiar. Mitigación: proveedor configurable y revisión de términos antes del despliegue.
- **Consistencia de historiales:** cambiar precio/estado sin evento produce auditoría incompleta. Mitigación: triggers/RPC transaccionales y solo inserción.
- **Alcance amplio:** hay muchos módulos para una sola entrega. Mitigación: fases con incrementos comprobables; no declarar un módulo completo hasta probarlo.
- **Dependencia del proveedor:** límites y costos de Supabase/hosting son desconocidos. Mitigación: verificar cuotas y disponibilidad antes de comprometer operaciones.
- **Métricas sesgadas:** renderizados repetidos o eventos manipulados inflan cifras. Mitigación: taxonomía, deduplicación temporal, endpoints limitados y métricas estimadas claramente etiquetadas.

## Decisiones pendientes de validar al implementar

- Gestor de paquetes y versiones exactas compatibles.
- Límites y disponibilidad de PostGIS y Storage en el proyecto Supabase elegido.
- Proveedor de geocodificación, teselas y sus condiciones de atribución/uso.
- El esquema PostGIS usa el schema no expuesto `extensions`; la migración Fase 7 depende de activar la extensión antes de aplicarse.
- MapLibre GL JS 6.19.0 se importa solo desde `MapCanvas` cliente; su worker se resuelve con `setWorkerUrl` siguiendo la configuración oficial de Next/Turbopack. El mapa usa una plantilla raster OSM configurable y requiere conexión de red; producción con carga alta debe configurar un proveedor con disponibilidad y capacidad adecuadas.
- El mapa deja `cooperativeGestures` desactivado para permitir arrastre con un dedo y zoom por pellizco en móvil; con la opción activada, MapLibre exige dos dedos. Controles táctiles propios apuntan a 44–48 CSS px.
- Retención de eventos analíticos y estados de publicación exactos.
- Si el proyecto requerirá pagos simulados con transacciones SQL atómicas o función RPC.

## Estado de implementación pública

- La portada ofrece búsqueda; `/propiedades` muestra el catálogo con filtros GET, ordenamiento y paginación; `/propiedad/[slug]` presenta metadatos, galería, descripción, características, mapa, contacto y visita.
- El repositorio lee publicaciones aprobadas desde Supabase; visibilidad Premium requiere una suscripción vigente. Sin configuración o filas visibles, el catálogo muestra estado vacío.
- Favoritos, comparación, historial de actividad, analítica, consultas CRM, visitas y CRUD Admin usan las mismas reglas para todas las propiedades publicadas.
- Las imágenes públicas usan URLs firmadas de Supabase Storage. Los slugs canónicos están normalizados; enlaces con el formato previo redirigen a la ruta actual.

## SEO y configuración del sitio — Fase 13

- `src/app/layout.tsx` genera metadatos raíz desde `site_settings`, con valores locales de respaldo cuando Supabase no está disponible.
- `src/app/sitemap.ts` compone rutas públicas y propiedades/agentes actualmente visibles bajo RLS. `src/app/robots.ts` expone sitemap y bloquea rastreo de rutas privadas; los layouts de autenticación y paneles incluyen `noindex`.
- `NEXT_PUBLIC_SITE_URL` define `metadataBase`, canonical, host y sitemap. Si no está configurada, el servidor usa el dominio Vercel de producción/deployment como fallback común para Auth y validación de `Origin`.
- `/admin/configuracion` edita una fila singleton mediante Server Action, Zod y sesión Supabase. La tabla `site_settings` tiene lectura pública y escritura reservada a Admin activo con RLS. Solo se publican nombre, frase, descripción y contacto expresamente guardados.
- El upsert de `site_settings` omite la clave `singleton` del payload para respetar el grant de columnas; PostgreSQL la establece a `true` por default. Los redirects Auth usan `NEXT_PUBLIC_SITE_URL` o los dominios de Vercel; Auth requiere que el callback esté permitido en Supabase.
- La ruta `/propiedades/mapa` vive en el route group `(public)` correcto; no usar comillas literales en nombres de carpetas App Router.
- Fase 14 separa `property_private_details` del catálogo público. Dirección, código postal, coordenadas exactas y actores de gestión se leen solo por Admin/agente asignado; la Data API ofrece coordenadas redondeadas y columnas explícitamente concedidas.

## Aviso de consultas por correo

La ruta `POST /api/crm/property-inquiry` conserva el RPC que registra el lead. Solo tras recibir éxito intenta Gmail SMTP desde servidor; el navegador no recibe la contraseña de aplicación. El aviso no cambia la asignación ni los permisos CRM. La migración 0023 desactiva la cola de 0022 reportada como aplicada.
