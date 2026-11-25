-- CRM: cola transaccional de avisos y respuestas. Aplicar después de 0021.
create table public.crm_email_outbox (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  kind text not null check (kind in ('inquiry_notification', 'agent_reply')),
  actor_id uuid references public.profiles(id) on delete set null,
  request_id uuid unique,
  recipient text not null,
  reply_to text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'uncertain')),
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  sent_at timestamptz
);
create index crm_email_outbox_lead_created_idx on public.crm_email_outbox(lead_id, created_at desc);
create index crm_email_outbox_pending_idx on public.crm_email_outbox(created_at) where status = 'pending';
create unique index crm_email_outbox_one_notice_idx on public.crm_email_outbox(lead_id) where kind = 'inquiry_notification';
alter table public.crm_email_outbox enable row level security;
revoke all on public.crm_email_outbox from anon, authenticated;
grant select on public.crm_email_outbox to authenticated;
grant select, update on public.crm_email_outbox to service_role;
create policy crm_email_outbox_team_read on public.crm_email_outbox
  for select to authenticated using (exists (select 1 from public.leads where id = lead_id));

create function private.enqueue_inquiry_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare property_title text;
begin
  select title into property_title from public.properties where id = new.property_id;
  insert into public.crm_email_outbox(lead_id, kind, recipient, reply_to, subject, body)
  values (new.id, 'inquiry_notification', 'paradiseurbanproperties@gmail.com', new.contact_email,
    'Nueva consulta: ' || coalesce(property_title, 'Paradise'),
    'Nombre: ' || new.contact_name || E'\nCorreo: ' || new.contact_email || E'\nInmueble: ' ||
    coalesce(property_title, 'Consulta general') || E'\n\n' || new.message ||
    E'\n\nPuedes responder este correo para contactar al cliente. Consulta registrada en CRM: ' || new.id::text);
  return new;
end;
$$;
revoke all on function private.enqueue_inquiry_email() from public, anon, authenticated;
create trigger leads_enqueue_email after insert on public.leads
for each row execute function private.enqueue_inquiry_email();

create function public.queue_lead_reply(target_lead_id uuid, reply_body text, client_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare lead_row public.leads; actor_name text; result_id uuid; property_title text;
begin
  select * into lead_row from public.leads where id = target_lead_id for update;
  if not found or not (coalesce(private.is_active_admin(), false) or
    coalesce((lead_row.assigned_agent_id = auth.uid() and private.is_active_agent(auth.uid())), false)) then
    raise exception 'lead_access_denied' using errcode = '42501';
  end if;
  if auth.uid() is null or reply_body is null or char_length(btrim(reply_body)) not between 1 and 4000
    or client_request_id is null then
    raise exception 'invalid_reply' using errcode = '22023';
  end if;
  select id into result_id from public.crm_email_outbox
    where request_id = client_request_id and lead_id = target_lead_id and actor_id = auth.uid();
  if found then return result_id; end if;
  if (select count(*) from public.crm_email_outbox where lead_id = target_lead_id
    and kind = 'agent_reply' and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'reply_rate_limited' using errcode = '22023';
  end if;
  select display_name into actor_name from public.profiles where id = auth.uid();
  select title into property_title from public.properties where id = lead_row.property_id;
  insert into public.crm_email_outbox(lead_id, kind, actor_id, request_id, recipient, reply_to, subject, body)
  values (target_lead_id, 'agent_reply', auth.uid(), client_request_id, lead_row.contact_email,
    'paradiseurbanproperties@gmail.com', 'Tu consulta: ' || coalesce(property_title, 'Paradise'),
    btrim(reply_body) || E'\n\n' || coalesce(actor_name, 'Equipo Paradise') || E'\nParadise · Atención inmobiliaria')
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.queue_lead_reply(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.queue_lead_reply(uuid, text, uuid) to authenticated;

-- Solo el servidor puede reclamar un trabajo; SKIP LOCKED impide envíos concurrentes del mismo registro.
create function public.claim_crm_email(target_email_id uuid default null, target_lead_id uuid default null)
returns setof public.crm_email_outbox language plpgsql security definer set search_path = '' as $$
begin
  update public.crm_email_outbox set status = 'uncertain', error_code = 'worker_interrupted'
    where status = 'processing' and started_at < now() - interval '5 minutes';
  -- No enviar respuestas de cuentas suspendidas o agentes que ya no tienen asignado el lead.
  update public.crm_email_outbox as mail set status = 'failed', error_code = 'actor_access_revoked'
    where mail.status = 'pending' and mail.kind = 'agent_reply' and not exists (
      select 1 from public.profiles as actor join public.leads as lead on lead.id = mail.lead_id
      where actor.id = mail.actor_id and actor.account_status = 'active'
        and (actor.base_role = 'admin' or (actor.base_role = 'agent' and lead.assigned_agent_id = actor.id))
    );
  return query
    update public.crm_email_outbox as mail set status = 'processing', started_at = now(), error_code = null
    where mail.id = (
      select candidate.id from public.crm_email_outbox as candidate
      where candidate.status = 'pending'
        and (target_email_id is null or candidate.id = target_email_id)
        and (target_lead_id is null or candidate.lead_id = target_lead_id)
      order by candidate.created_at for update skip locked limit 1
    ) returning mail.*;
end;
$$;
revoke all on function public.claim_crm_email(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_crm_email(uuid, uuid) to service_role;

-- Un reintento explícito solo se admite cuando el proveedor confirmó un fallo.
-- Los envíos inciertos requieren inspeccionar Gmail antes de cualquier decisión manual.
create function public.retry_crm_email(target_email_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_lead public.leads; mail_status text;
begin
  select lead.* into target_lead from public.leads as lead
    join public.crm_email_outbox as mail on mail.lead_id = lead.id where mail.id = target_email_id;
  if not found or not (coalesce(private.is_active_admin(), false) or
    coalesce(target_lead.assigned_agent_id = auth.uid() and private.is_active_agent(auth.uid()), false)) then
    raise exception 'lead_access_denied' using errcode = '42501';
  end if;
  select status into mail_status from public.crm_email_outbox where id = target_email_id for update;
  if mail_status = 'failed' then
    update public.crm_email_outbox set status = 'pending', error_code = null, started_at = null where id = target_email_id;
  elsif mail_status <> 'pending' then
    raise exception 'email_not_retryable' using errcode = '22023';
  end if;
  return target_email_id;
end;
$$;
revoke all on function public.retry_crm_email(uuid) from public, anon, authenticated;
grant execute on function public.retry_crm_email(uuid) to authenticated;
