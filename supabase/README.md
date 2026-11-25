# Supabase

El usuario configuró un proyecto Supabase y reporta haber aplicado las migraciones 0001–0010; confirma que flujos Premium, tracking, ranking, selector, desgloses y CSV funcionan. El usuario confirmó la firma de `search_public_properties_nearby`; un sondeo RPC anónimo y la lectura del catálogo respondieron HTTP 200 con un resultado cada una. El `PGRST125` anterior no se reprodujo con la ruta canónica y su causa no quedó identificada; falta verificar la búsqueda desde la interfaz. No se inspeccionó el historial de migraciones remoto. No ingresar secretos en este documento.

Al iniciar las fases de backend se deberá:

1. Crear entornos separados de desarrollo y producción y documentar sus límites.
2. Confirmar disponibilidad de PostGIS y políticas de Storage en el plan elegido.
3. Las migraciones 0001–0020 constan funcionales según los reportes del usuario; no repetirlas. No se inspeccionó el historial remoto.
4. Activar RLS y grants mínimos en todas las tablas expuestas antes de conceder acceso vía Data API.
5. Probar políticas bajo cada rol y crear `seed.sql` con datos demostrativos identificados como ficticios.
6. Mantener la clave `service_role` exclusivamente en el servidor.

Fase 4: configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`, y permitir `http://localhost:3000/auth/callback` en Supabase Auth. El usuario reportó aplicar `202611230001_auth_foundation.sql`.

Fase 5: el usuario reporta que aplicó `migrations/202611230002_roles_and_permissions.sql` desde SQL Editor y promovió el primer Admin. Esto agrega roles/estado, helper privado, lectura admin de perfiles y un RPC acotado que registra cambios de acceso en `audit_logs`. El usuario ahora confirma que RLS está aprobado; esta sesión no reprodujo las pruebas por identidad.

Fase 6: el usuario confirma que ejecutó `migrations/202611230003_properties.sql` desde SQL Editor sin error. Esta crea propiedades, asignaciones, metadata de imágenes, características, índices, grants/RLS y policies para el bucket privado. El catálogo y el panel Admin ya usan estas tablas; el usuario confirma que la operación real con propiedades e imágenes funciona y que RLS está aprobado.

Fase 6: el usuario confirma que propiedades, fotografías, publicación y cambios/historial de precio funcionan. Las migraciones 0003–0004 se consideran aplicadas según esa validación; el usuario confirma que RLS está aprobado, aunque esta sesión no repitió las pruebas SQL.

Fase 7: el usuario reporta PostGIS habilitado en `extensions`; una consulta anterior confirma la columna geography y el usuario confirmó la firma de la RPC cercana de 0005. Los mapas de Admin y ficha pública también fueron confirmados por el usuario. La RPC anónima y la consulta posterior de catálogo respondieron HTTP 200 con una fila cada una; falta validar la búsqueda por radio desde la interfaz.

Fase 8: el usuario reporta aplicar `202611230006_premium_subscriptions.sql` y confirma que el flujo Premium completo funciona, incluida la cancelación. `202611230007_premium_cancel.sql` añade cancelación del titular y administrativa por RPC, sin escritura directa sobre suscripciones. No inspeccionamos directamente el historial remoto de migraciones; no volver a ejecutar 0001–0006. Las pruebas negativas automatizadas de RLS permanecen en Fase 14.

Fase 9: el usuario confirma que tracking, gráfica, ranking, selector, desgloses y CSV funcionan con 0008–0010.

Fase 10: el usuario confirma que CRM funciona; 0013 se considera validada según su reporte, sin inspección remota directa.

Fase 11: el usuario confirma que favoritos, comparación, listas e historial de actividad funcionan; 0014–0016 se consideran validadas según su reporte.

Fase 12: el usuario confirma que las notificaciones Premium/CRM funcionan; 0017 se considera validada según su reporte, sin inspección del historial remoto.

Fase 13: aplicar `migrations/202611240018_site_settings.sql` en el proyecto de desarrollo. Probar escritura como Admin activo, rechazo de otros roles y lectura pública de campos de identidad/contacto. No repetir migraciones previas. Configure `NEXT_PUBLIC_SITE_URL` en el entorno de despliegue.

El usuario reporta que nombre y SEO funcionan, pero correo/teléfono no se guardaban. El upsert local se corrigió para omitir la llave singleton, que no tiene grant UPDATE; probar el resultado tras el próximo deployment. No repetir 0018.

Fase 14: el usuario confirma asignación/revocación tras 0019 y auditoría tras 0020; se consideran funcionales según su reporte, sin inspección remota. Aplicar `migrations/202611240021_private_property_details.sql` y validar privacidad de propiedades con roles separados. 0021 concede a usuarios autorizados solo las columnas privadas que usa el panel; los IDs de autor/aprobador y timestamps internos no son legibles desde Data API.

### Primer administrador

No se promueve automáticamente ninguna cuenta desde la aplicación. Después de aplicar la migración de Fase 5, el propietario del proyecto asigna manualmente el primer Admin en SQL Editor, reemplazando el correo por el suyo:

```sql
update public.profiles as profile
set base_role = 'admin'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('paradiseurbanproperties@gmail.com');
```

Verifica que el editor informe una fila actualizada. Este paso de bootstrap se ejecuta una sola vez por el propietario del proyecto; los cambios posteriores deben pasar por la función autorizada y auditada. Mantener `.env.local` fuera de Git y nunca compartir claves secretas.

### Aviso de correo CRM

El usuario reportó 0022 aplicada, aunque no se verificó el historial remoto. No repetirla. Aplicar una sola vez `migrations/202611250023_simplify_crm_email.sql` para retirar su trigger/RPC antiguos; conserva la tabla y sus registros. El aviso nuevo usa Gmail SMTP tras guardar el lead; configuración en [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).
