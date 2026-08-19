-- Dados de exemplo pra instanciar a "Barbearia do Jean" como o primeiro tenant real.
-- Rode depois de schema.sql.

insert into barbershops (slug, name, city, theme)
values (
  'barbearia-do-jean',
  'Barbearia do Jean',
  'Salvador',
  '{
    "ink": "#161311",
    "cream": "#efe6d3",
    "red": "#a62422",
    "navy": "#1c3a5e",
    "brass": "#b98a2e",
    "display_font": "Bevan",
    "body_font": "Oswald"
  }'::jsonb
)
returning id;
-- ⚠️ copie o "id" retornado acima e cole no lugar de <BARBERSHOP_ID> abaixo

insert into barbers (barbershop_id, display_name, role_label, photo_url)
values
  ('<BARBERSHOP_ID>', 'Jean', 'Dono & Barbeiro', null), -- foto sobe pro Supabase Storage depois
  ('<BARBERSHOP_ID>', 'Maicon', 'Barbeiro', null);

insert into services (barbershop_id, name, duration_min, sort_order)
values
  ('<BARBERSHOP_ID>', 'Cabelo + Barba', 45, 1),
  ('<BARBERSHOP_ID>', 'Cabelo', 30, 2),
  ('<BARBERSHOP_ID>', 'Barba', 20, 3),
  ('<BARBERSHOP_ID>', 'Pé de cabelo', 15, 4),
  ('<BARBERSHOP_ID>', 'Sobrancelha', 10, 5);
