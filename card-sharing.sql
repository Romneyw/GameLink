-- Run once in your GameLink Supabase project's SQL Editor.
-- Stores only card data the gamer explicitly chooses to publish.
begin;
create table if not exists public.gamelink_public_cards (
 id uuid primary key references auth.users(id) on delete cascade,
 card jsonb not null,
 constraint gamelink_card_size check (octet_length(card::text) <= 6000000),
 constraint gamelink_card_shape check (
   jsonb_typeof(card) = 'object'
   and card @> '{"version":1}'::jsonb
   and jsonb_typeof(card->'values') = 'object'
   and coalesce(length(btrim(card->'values'->>'gamer-name')),0) between 1 and 40
 )
);
alter table public.gamelink_public_cards enable row level security;
revoke all on public.gamelink_public_cards from anon, authenticated;
grant select on public.gamelink_public_cards to anon, authenticated;
grant insert, update, delete on public.gamelink_public_cards to authenticated;
drop policy if exists "Public cards can be viewed" on public.gamelink_public_cards;
create policy "Public cards can be viewed" on public.gamelink_public_cards for select to anon, authenticated using (true);
drop policy if exists "Owners publish cards" on public.gamelink_public_cards;
create policy "Owners publish cards" on public.gamelink_public_cards for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Owners update cards" on public.gamelink_public_cards;
create policy "Owners update cards" on public.gamelink_public_cards for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "Owners remove cards" on public.gamelink_public_cards;
create policy "Owners remove cards" on public.gamelink_public_cards for delete to authenticated using ((select auth.uid()) = id);
commit;
