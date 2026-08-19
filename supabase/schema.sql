-- ============================================================
-- CADEIRA LIVRE — schema do banco (Supabase / Postgres)
-- Multi-tenant: cada barbearia é uma linha em "barbershops".
-- Todo o resto (barbeiros, serviços, horários, reservas) se
-- relaciona a um barbershop_id, o que isola os dados de cada
-- barbearia automaticamente.
-- ============================================================

-- extensão pra gerar UUID
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- BARBEARIAS (tenants)
-- ------------------------------------------------------------
create table barbershops (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,        -- "barbearia-do-jean" -> vira o subdomínio
  name         text not null,               -- "Barbearia do Jean"
  city         text,
  theme        jsonb default '{}'::jsonb,   -- cores, fontes, logo_url — estética por tenant
  created_at   timestamptz default now()
);

-- ------------------------------------------------------------
-- USUÁRIOS (clientes E barbeiros vivem na mesma tabela de perfil,
-- ligada ao auth.users que o Supabase Auth já gerencia)
-- ------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  phone        text,
  avatar_url   text,
  created_at   timestamptz default now()
);

-- ------------------------------------------------------------
-- BARBEIROS — quem atende em qual barbearia
-- ------------------------------------------------------------
create table barbers (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references barbershops(id) on delete cascade,
  profile_id     uuid references profiles(id),   -- null até o barbeiro criar login
  display_name   text not null,                  -- "Jean", "Maicon"
  role_label     text default 'Barbeiro',        -- "Dono & Barbeiro", "Barbeiro"
  photo_url      text,
  active         boolean default true,
  created_at     timestamptz default now()
);

-- ------------------------------------------------------------
-- SERVIÇOS oferecidos por barbearia (preço e duração podem
-- variar de uma barbearia pra outra, então ficam por tenant)
-- ------------------------------------------------------------
create table services (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references barbershops(id) on delete cascade,
  name           text not null,        -- "Cabelo + Barba"
  duration_min   int not null,
  price_cents    int,
  sort_order     int default 0
);

-- ------------------------------------------------------------
-- HORÁRIOS DISPONÍVEIS — o barbeiro abre um slot pra um dia
-- ------------------------------------------------------------
create table availability_slots (
  id           uuid primary key default gen_random_uuid(),
  barber_id    uuid not null references barbers(id) on delete cascade,
  slot_date    date not null,
  slot_time    time not null,
  is_open      boolean default true,
  created_at   timestamptz default now(),
  unique (barber_id, slot_date, slot_time)
);

-- ------------------------------------------------------------
-- RESERVAS — cliente agenda um serviço com um barbeiro num slot
-- ------------------------------------------------------------
create table bookings (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references barbershops(id) on delete cascade,
  barber_id      uuid not null references barbers(id) on delete cascade,
  service_id     uuid not null references services(id),
  client_id      uuid references profiles(id),   -- quem agendou (só o barbeiro enxerga via RLS)
  slot_date      date not null,
  slot_time      time not null,
  status         text default 'confirmed',       -- confirmed | cancelled
  created_at     timestamptz default now(),
  unique (barber_id, slot_date, slot_time)        -- trava o mesmo horário duas vezes
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Regra central do produto: "o cliente vê que o horário sumiu,
-- só o barbeiro vê quem marcou".
-- ============================================================
alter table bookings enable row level security;
alter table availability_slots enable row level security;

-- qualquer pessoa autenticada pode VER que um horário existe (pra montar a grade)
create policy "slots são públicos para leitura"
  on availability_slots for select
  using (true);

-- só o próprio barbeiro (dono do profile_id) pode abrir/fechar seus horários
create policy "barbeiro gerencia os próprios slots"
  on availability_slots for all
  using (
    barber_id in (select id from barbers where profile_id = auth.uid())
  );

-- cliente pode criar uma reserva (mas não ler as reservas de outras pessoas)
create policy "cliente cria a própria reserva"
  on bookings for insert
  with check (client_id = auth.uid());

-- cliente só lê as próprias reservas
create policy "cliente lê as próprias reservas"
  on bookings for select
  using (client_id = auth.uid());

-- barbeiro lê e gerencia todas as reservas da própria agenda
create policy "barbeiro lê a própria agenda"
  on bookings for select
  using (barber_id in (select id from barbers where profile_id = auth.uid()));

create policy "barbeiro cancela reservas da própria agenda"
  on bookings for update
  using (barber_id in (select id from barbers where profile_id = auth.uid()));

-- cliente pode cancelar (mas não editar mais nada) a própria reserva
create policy "cliente cancela a própria reserva"
  on bookings for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- perfis: cada pessoa gerencia o próprio; barbeiros também podem ler o nome
-- de quem reservou com eles (é o único caso em que um nome "vaza" pra outra
-- pessoa, e é exatamente a regra do produto: só o barbeiro vê quem marcou)
alter table profiles enable row level security;

create policy "usuário lê e edita o próprio perfil"
  on profiles for all
  using (id = auth.uid());

create policy "barbeiro lê o perfil de quem reservou com ele"
  on profiles for select
  using (
    id in (
      select client_id from bookings
      where barber_id in (select id from barbers where profile_id = auth.uid())
    )
  );
