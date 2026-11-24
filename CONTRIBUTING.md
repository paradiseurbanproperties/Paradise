# Guía de contribución

## Estado del proyecto

El proyecto está en Fase 0. No se aceptan como implementadas funciones que solo estén descritas. La Fase 1 y las posteriores requieren autorización explícita del responsable académico.

## Antes de modificar

1. Lee `PROGRESO.txt` y la documentación del módulo correspondiente.
2. Revisa el estado de Git y los archivos existentes antes de editar.
3. Mantén páginas enfocadas en composición, lógica de negocio en servicios y consultas en repositorios.
4. Centraliza validaciones reutilizables con Zod y aplica permisos en servidor más RLS.
5. No agregues secretos ni uses la clave Supabase `service_role` en el navegador.

## Calidad esperada al iniciar implementación

- TypeScript estricto y componentes accesibles.
- Cambios pequeños por módulo, migraciones SQL versionadas y documentación actualizada.
- Pruebas de las reglas modificadas y de los permisos asociados antes de marcar una función como terminada.
- Errores, limitaciones de servicios externos y pasos de reproducción consignados en `PROGRESO.txt`.
- Actualizar `CHANGELOG.md` después de cada avance significativo.

## Flujo de trabajo previsto

El gestor seleccionado es pnpm 12.19.0 y el repositorio Git ya está inicializado. Los comandos locales son `pnpm dev`, `pnpm lint`, `pnpm typecheck` y `pnpm build`. En este entorno el build puede requerir ejecutarse fuera del sandbox por las restricciones de procesos y puertos locales.
