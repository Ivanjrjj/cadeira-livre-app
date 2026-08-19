# Cadeira Livre — esqueleto do projeto

Plataforma multi-tenant de agendamento para barbearias. Este é o ponto de
partida de código real (não protótipo) descrito na conversa: cada barbearia
vira uma linha no banco e um subdomínio, e a "Barbearia do Jean" é o primeiro
tenant.

## Stack

- **Next.js + TypeScript + Tailwind** — front-end web, com rota de API embutida
- **Supabase** — Postgres (dados), Auth (login com Google já pronto), Storage (fotos dos barbeiros)
- **Vercel** — hospedagem, com subdomínio wildcard (`*.cadeiralivre.app`)
- **React Native (Expo)** — quando for pro mobile, conversa com o mesmo Supabase

## Estrutura

```
middleware.ts                    → resolve o subdomínio (barbearia-do-jean.cadeiralivre.app → /b/barbearia-do-jean)
lib/supabase/client.ts           → cliente Supabase pro navegador
lib/supabase/server.ts           → cliente Supabase pro servidor (API routes)
app/api/availability/route.ts    → GET horários livres de um barbeiro num dia
app/api/bookings/route.ts        → POST cria uma reserva (protegida contra 2 pessoas pegarem o mesmo horário)
supabase/schema.sql              → todas as tabelas + as regras de segurança (RLS)
supabase/seed_barbearia_do_jean.sql → dados de exemplo pra popular a Barbearia do Jean
```

O que falta para virar app navegável (próximo passo natural): as páginas em
`app/b/[slug]/...` que consomem essas rotas de API — a UI e o fluxo de telas já
estão validados no protótipo interativo `barbearia-do-jean.html` que te mandei
antes; é questão de portar aquele HTML/CSS pros componentes React deste projeto.

## Como rodar (fora deste ambiente, que não tem acesso à internet)

1. Crie um projeto grátis em [supabase.com](https://supabase.com)
2. No SQL Editor do Supabase, rode `supabase/schema.sql` e depois
   `supabase/seed_barbearia_do_jean.sql` (trocando `<BARBERSHOP_ID>` pelo id
   que o primeiro insert retornar)
3. Em **Authentication → Providers**, ative o login com Google
4. Copie `.env.example` para `.env.local` e preencha com a URL e a chave
   anônima do seu projeto Supabase
5. `npm install`
6. `npm run dev`

## Por que essa modelagem

- `barbershops` é a tabela raiz do multi-tenant: tudo (barbeiro, serviço,
  horário, reserva) aponta pra um `barbershop_id`, então os dados de uma
  barbearia nunca se misturam com os de outra.
- A trava de "só o barbeiro vê quem reservou" não é só uma regra de tela —
  está no banco (Row Level Security), então nem um erro de código expõe o
  nome de um cliente pra outro.
- A constraint `unique (barber_id, slot_date, slot_time)` na tabela
  `bookings` é o que garante, no nível do banco, que dois clientes nunca
  consigam roubar o mesmo horário um do outro.
