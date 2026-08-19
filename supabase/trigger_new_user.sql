-- Sempre que alguém cria conta (ex: primeiro login com Google), o Supabase
-- Auth cria uma linha em auth.users. Esse gatilho copia o nome e a foto que
-- vieram do Google para a tabela profiles automaticamente — sem isso, um
-- agendamento falharia porque bookings.client_id espera um profile existente.
-- Rode este arquivo no SQL Editor depois de schema.sql.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
