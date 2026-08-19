-- ============================================================
-- 1) POVOAR HORÁRIOS REAIS (08:00–19:00) para os próximos 14 dias
-- Sem isso, a tela do cliente fica vazia mesmo com os barbeiros
-- cadastrados, porque não existe nenhum horário "aberto" no banco.
-- ============================================================
insert into availability_slots (barber_id, slot_date, slot_time, is_open)
select b.id, d::date, t::time, true
from barbers b
cross join generate_series(current_date, current_date + interval '13 days', interval '1 day') as d
cross join generate_series('08:00'::time, '19:00'::time, interval '45 minutes') as t
where b.barbershop_id = (select id from barbershops where slug = 'barbearia-do-jean')
on conflict (barber_id, slot_date, slot_time) do nothing;

-- Quer ir até 23:00 em vez de 19:00? Troque o '19:00' acima por '23:00'
-- e rode de novo (o "on conflict do nothing" evita duplicar o que já existe).

-- ============================================================
-- 2) VINCULAR SEU E-MAIL COMO ADMIN DE TESTE (Jean)
-- PASSO ANTES DE RODAR ISTO: acesse
--   https://cadeira-livre-app.vercel.app/b/barbearia-do-jean/barbeiro
-- e clique em "Entrar com Google" usando ivanjrba@gmail.com.
-- Isso cria automaticamente sua linha em auth.users e profiles.
-- SÓ DEPOIS disso o comando abaixo tem o que vincular.
-- ============================================================
update barbers
set profile_id = (select id from auth.users where email = 'ivanjrba@gmail.com')
where display_name = 'Jean'
  and barbershop_id = (select id from barbershops where slug = 'barbearia-do-jean');

-- Confirma que vinculou certo:
select display_name, profile_id from barbers where barbershop_id = (select id from barbershops where slug = 'barbearia-do-jean');
