-- Retira la cola de correo de 0022: los avisos ahora salen directamente por SMTP.
-- Aplicar una vez después de 0022. No toca leads, interacciones ni asignaciones.
drop trigger if exists leads_enqueue_email on public.leads;
drop function if exists private.enqueue_inquiry_email();
drop function if exists public.claim_crm_email(uuid, uuid);
drop function if exists public.retry_crm_email(uuid);
drop function if exists public.queue_lead_reply(uuid, text, uuid);
-- La tabla queda como archivo de cualquier aviso previo; ya no se escriben nuevas filas.

