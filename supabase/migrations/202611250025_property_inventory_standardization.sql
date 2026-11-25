-- Normaliza los doce inmuebles cargados para que sigan los flujos estándar del catálogo.
do $$
begin
  if exists (
    select 1
    from (values
      ('demo-casa-patio-de-luz', 'casa-patio-de-luz'),
      ('demo-casa-juriquilla-encino', 'casa-juriquilla-encino'),
      ('demo-casa-lomas-del-parque', 'casa-lomas-del-parque'),
      ('demo-casa-chapalita', 'casa-arboleda-chapalita'),
      ('demo-casa-valle-norte', 'casa-valle-norte'),
      ('demo-casa-fresnos-coyoacan', 'casa-fresnos-de-coyoacan'),
      ('demo-casa-valle-real-zapopan', 'casa-vistahermosa-valle-real'),
      ('demo-casa-roble-temozon', 'casa-roble-de-temozon'),
      ('demo-casa-mar-de-cortes', 'casa-mar-de-cortes'),
      ('demo-casa-bosque-niebla', 'casa-bosque-de-niebla'),
      ('demo-casa-arboledas-calera', 'casa-arboledas-de-la-calera'),
      ('demo-casa-cumbres-monterrey', 'casa-cumbres-del-norte')
    ) as slug_map(old_slug, new_slug)
    join public.properties as current_property on current_property.slug = slug_map.old_slug
    join public.properties as conflicting_property
      on conflicting_property.slug = slug_map.new_slug
     and conflicting_property.id <> current_property.id
  ) then
    raise exception 'A canonical property slug is already in use; resolve the conflict before applying this migration.';
  end if;
end;
$$;

update public.properties as property
set slug = slug_map.new_slug,
    description = regexp_replace(property.description, '^FICHA DE DEMOSTRACIÓN[.] *', ''),
    updated_at = now()
from (values
  ('demo-casa-patio-de-luz', 'casa-patio-de-luz'),
  ('demo-casa-juriquilla-encino', 'casa-juriquilla-encino'),
  ('demo-casa-lomas-del-parque', 'casa-lomas-del-parque'),
  ('demo-casa-chapalita', 'casa-arboleda-chapalita'),
  ('demo-casa-valle-norte', 'casa-valle-norte'),
  ('demo-casa-fresnos-coyoacan', 'casa-fresnos-de-coyoacan'),
  ('demo-casa-valle-real-zapopan', 'casa-vistahermosa-valle-real'),
  ('demo-casa-roble-temozon', 'casa-roble-de-temozon'),
  ('demo-casa-mar-de-cortes', 'casa-mar-de-cortes'),
  ('demo-casa-bosque-niebla', 'casa-bosque-de-niebla'),
  ('demo-casa-arboledas-calera', 'casa-arboledas-de-la-calera'),
  ('demo-casa-cumbres-monterrey', 'casa-cumbres-del-norte')
) as slug_map(old_slug, new_slug)
where property.slug = slug_map.old_slug
   or (property.slug = slug_map.new_slug and property.description like 'FICHA DE DEMOSTRACIÓN.%');

update public.property_private_details as details
set address = concat_ws(', ', nullif(btrim(property.neighborhood), ''), property.city, property.state)
from public.properties as property
where property.id = details.property_id
  and property.slug in (
    'casa-patio-de-luz', 'casa-juriquilla-encino', 'casa-lomas-del-parque',
    'casa-arboleda-chapalita', 'casa-valle-norte', 'casa-fresnos-de-coyoacan',
    'casa-vistahermosa-valle-real', 'casa-roble-de-temozon', 'casa-mar-de-cortes',
    'casa-bosque-de-niebla', 'casa-arboledas-de-la-calera', 'casa-cumbres-del-norte'
  )
  and details.address like 'Domicilio de referencia en %';

update public.property_images as image
set alt_text = concat('Fotografía de ', property.title, ' en ', property.neighborhood)
from public.properties as property
where property.id = image.property_id
  and property.slug in (
    'casa-patio-de-luz', 'casa-juriquilla-encino', 'casa-lomas-del-parque',
    'casa-arboleda-chapalita', 'casa-valle-norte', 'casa-fresnos-de-coyoacan',
    'casa-vistahermosa-valle-real', 'casa-roble-de-temozon', 'casa-mar-de-cortes',
    'casa-bosque-de-niebla', 'casa-arboledas-de-la-calera', 'casa-cumbres-del-norte'
  )
  and image.alt_text like 'Fotografía ilustrativa de una casa en %';
