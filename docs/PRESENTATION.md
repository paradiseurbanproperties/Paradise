# Presentación académica — borrador de Fase 0

## Introducción

Paradise es el diseño de una plataforma inmobiliaria que integra el catálogo visible al público y herramientas de operación para clientes, agentes y administradores. En Fase 0 se definió una arquitectura inicial; la aplicación todavía no está construida.

## Objetivo general

Diseñar y desarrollar por etapas una plataforma modular para administrar propiedades, publicaciones, clientes, agentes, visitas, seguimiento comercial y suscripciones simuladas, con control de acceso y trazabilidad.

## Objetivos específicos

- Publicar y buscar propiedades con filtros y ubicación geográfica.
- Dar a clientes herramientas de favoritos, comparación y visitas.
- Permitir a agentes gestionar propiedades asignadas e interesados mediante CRM.
- Proporcionar administración de publicaciones, usuarios, configuración y métricas.
- Aplicar validación en servidor, RLS y auditoría en operaciones sensibles.

## Justificación y alcance

Una inmobiliaria requiere coordinar información pública y procesos internos. El diseño separa esas responsabilidades por módulo y contempla el ciclo desde publicación hasta contacto/visita. No incluye compraventa dentro de la plataforma ni pagos reales; Premium usará una simulación académica. Integraciones, alojamiento y servicios externos siguen pendientes.

## Arquitectura y tecnologías

Monolito modular Next.js App Router con TypeScript; Supabase PostgreSQL/Auth/Storage; PostGIS para geografía si está habilitado; MapLibre para visualización; validación Zod. Se eligen límites de módulos para mantener el código entendible sin introducir microservicios prematuros. Versión inicial y detalles: [arquitectura](ARCHITECTURE.md).

## Modelo de datos

Identidad en Supabase Auth y perfil/rol separado; propiedades y asignaciones; imágenes, características e historial de precio; listas y favoritos; solicitudes/historial de visitas; leads e interacciones; suscripciones y pagos ficticios; eventos, auditoría y configuración. Relaciones detalladas en [DATABASE.md](DATABASE.md).

## Funcionamiento de módulos

Las rutas componen pantallas y delegan reglas a servicios. Los repositorios hacen consultas con contexto de usuario para conservar RLS. El catálogo solo expondría publicaciones aprobadas y el acceso a propiedades Premium se resolvería por estado de suscripción vigente. Las operaciones mutables sensibles se verifican y auditan en servidor.

## Seguridad

Roles base controlados por servidor, Premium derivado de suscripción, RLS por dueño/asignación, clave privilegiada solo servidor, validación de entrada, límites de carga y rate limiting planeado. Los controles aún no están implementados ni verificados: [SECURITY.md](SECURITY.md).

Estado de módulos: el usuario confirma el flujo de propiedades, fotos, publicación e historial de precios funcional al 100% y confirma que el mapa se ve en la ficha pública. Una consulta en Supabase confirma que 0005 está aplicada; queda probar la búsqueda cercana con datos reales. El usuario reporta aplicar 0006 y confirma que el flujo Premium completo funciona, incluido `/premium`, historial, cancelación y `/admin/suscripciones`. Las pruebas negativas automatizadas de RLS quedan para Fase 14.

## Conclusiones de diseño

Fase 0 establece una base de módulos y entidades para implementar incrementalmente. El avance real debe medirse por funcionalidades implementadas y probadas, no por el volumen de documentación. El siguiente paso es preparar el entorno cuando se autorice Fase 1.

## Guion de demostración futuro

Una vez implementadas y probadas las fases correspondientes, demostrar en orden: (1) inicio, (2) catálogo, (3) búsqueda geográfica, (4) comparación, (5) favoritos, (6) registro, (7) perfil, (8) tema oscuro, (9) suscripción ficticia, (10) acceso Premium, (11) solicitud de visita, (12) historial de precios, (13) panel agente, (14) CRM, (15) panel admin, (16) alta de propiedad, (17) cambio de estado, (18) métricas, (19) auditoría y (20) esquema/base de datos. No presentar pantallas o datos como operativos antes de su implementación.

## Preguntas que podría realizar el profesor

**¿Por qué Next.js y Supabase?** Next.js organiza frontend y endpoints/casos de uso en un solo despliegue; Supabase aporta PostgreSQL, Auth y Storage con RLS. Se evita desplegar un backend separado antes de necesitarlo.

**¿Cómo se evita que un usuario se haga administrador?** El rol no se acepta desde formularios ni metadata controlable; se administra en servidor y las políticas RLS limitan operaciones.

**¿Premium es un rol?** No. Se deriva de una suscripción activa que no haya vencido, validada en servidor.

**¿Se pueden comprar casas o pagar realmente?** No. La plataforma no vende propiedades; la pasarela Premium es ficticia y no acepta ni guarda datos bancarios.

**¿Cómo se evita una doble cita?** La decisión final se hace en una operación transaccional con restricción de intervalos o rutina SQL atómica.

**¿Qué garantiza que las métricas sean reales?** Se generan de eventos definidos, deduplicados y autorizados; el plan separa vistas, usuarios estimados, conversiones y dinero simulado. Aún no hay métricas implementadas.

**¿Qué está terminado hoy?** Solo análisis y documentación inicial de Fase 0. No hay aplicación, migraciones ni pruebas ejecutadas.
