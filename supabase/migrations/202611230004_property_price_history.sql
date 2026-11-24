-- Fase 6: historial inmutable y transaccional de cambios de precio.

create table public.property_price_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  previous_price numeric(14, 2) not null check (previous_price >= 0),
  new_price numeric(14, 2) not null check (new_price >= 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  reason text check (reason is null or char_length(reason) <= 500),
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  constraint property_price_history_changed check (previous_price <> new_price)
);

create index property_price_history_property_date_idx
  on public.property_price_history (property_id, changed_at desc);

alter table public.property_price_history enable row level security;
revoke all on table public.property_price_history from anon, authenticated;
grant select on table public.property_price_history to anon, authenticated;

create policy property_price_history_public_read
  on public.property_price_history for select to anon
  using (
    exists (
      select 1 from public.properties as property
      where property.id = property_id
        and property.publication_status = 'approved'
        and property.visibility in ('public', 'both')
    )
  );
create policy property_price_history_authenticated_read
  on public.property_price_history for select to authenticated
  using (
    exists (
      select 1 from public.properties as property
      where property.id = property_id
        and property.publication_status = 'approved'
        and property.visibility in ('public', 'both')
    )
    or (select private.is_active_admin())
    or (select private.is_assigned_agent(property_id))
  );

-- Trigger execution runs in the same transaction as UPDATE properties.
-- The table grants no direct insert/update/delete path to application roles.
create or replace function public.record_property_price_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.price is distinct from new.price then
    insert into public.property_price_history (
      property_id, previous_price, new_price, currency, changed_by
    ) values (
      new.id, old.price, new.price, new.currency, (select auth.uid())
    );
  end if;
  return new;
end;
$$;

revoke all on function public.record_property_price_change() from public, anon, authenticated;

create trigger properties_record_price_change
  after update of price on public.properties
  for each row execute function public.record_property_price_change();
