-- Fase 13: configuración pública editable solo por una cuenta Admin activa.
create table public.site_settings (
  singleton boolean primary key default true check (singleton),
  site_name text not null default 'Paradise' check (char_length(site_name) between 1 and 100),
  tagline text not null default '' check (char_length(tagline) <= 180),
  seo_description text not null default '' check (char_length(seo_description) <= 300),
  public_email text not null default '' check (char_length(public_email) <= 254),
  public_phone text not null default '' check (char_length(public_phone) <= 40),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
revoke all on table public.site_settings from public, anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant insert (singleton, site_name, tagline, seo_description, public_email, public_phone, updated_by)
  on table public.site_settings to authenticated;
grant update (site_name, tagline, seo_description, public_email, public_phone, updated_by, updated_at)
  on table public.site_settings to authenticated;

create policy site_settings_public_read
  on public.site_settings for select to anon, authenticated
  using (singleton);

create policy site_settings_admin_insert
  on public.site_settings for insert to authenticated
  with check ((select private.is_active_admin()) and updated_by = (select auth.uid()));

create policy site_settings_admin_update
  on public.site_settings for update to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()) and updated_by = (select auth.uid()));

create or replace function private.set_site_settings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_site_settings_updated_at() from public, anon, authenticated;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function private.set_site_settings_updated_at();
