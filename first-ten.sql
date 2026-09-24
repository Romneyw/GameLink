-- GameLink First 10. Run AFTER card-sharing.sql in Supabase SQL Editor.
-- Rerunning this script preserves issued numbers. No claims are made by setup.
begin;
create table if not exists public.gamelink_founder_slots (
 number smallint primary key check (number between 1 and 10),
 user_id uuid unique references auth.users(id) on delete set null,
 issued_at timestamptz,
 check (user_id is null or issued_at is not null)
);
alter table public.gamelink_founder_slots enable row level security;
revoke all on public.gamelink_founder_slots from public, anon, authenticated;
insert into public.gamelink_founder_slots(number)
 select generate_series(1,10) on conflict(number) do nothing;

alter table public.gamelink_public_cards add column if not exists founder_number smallint
 check (founder_number between 1 and 10);

-- A deleted account leaves its issued slot retired, never available again.
create or replace function public.gamelink_founder_status()
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
  'issued', (select count(*) from public.gamelink_founder_slots where issued_at is not null),
  'remaining', (select count(*) from public.gamelink_founder_slots where issued_at is null),
  'my_number', (select number from public.gamelink_founder_slots where user_id = auth.uid()),
  'logged_in', auth.uid() is not null,
  'eligible', exists (
   select 1 from public.profiles p where p.id = auth.uid()
    and length(btrim(p.gamer_name)) > 0 and length(btrim(p.country)) > 0
    and length(btrim(p.language)) > 0
    and jsonb_typeof(p.game_ranks) = 'object' and p.game_ranks <> '{}'::jsonb
  )
 );
$$;
revoke all on function public.gamelink_founder_status() from public;
grant execute on function public.gamelink_founder_status() to anon, authenticated;

create or replace function public.gamelink_claim_founder()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_number smallint; v_status jsonb;
begin
 if v_user is null then raise exception 'Log in to claim your edition.'; end if;
 -- Serializes all claim attempts, including concurrent requests by one account.
 -- Lock remains held until the request transaction commits or rolls back.
 lock table public.gamelink_founder_slots in share row exclusive mode;
 select number into v_number from public.gamelink_founder_slots where user_id = v_user;
 if v_number is not null then return public.gamelink_founder_status(); end if;
 v_status := public.gamelink_founder_status();
 if not (v_status->>'eligible')::boolean then
  raise exception 'Complete your gamer profile (name, country, language and a game) before claiming.';
 end if;
 select number into v_number from public.gamelink_founder_slots
  where issued_at is null order by number limit 1;
 if v_number is null then raise exception 'All 10 Founding Player editions have been claimed.'; end if;
 update public.gamelink_founder_slots set user_id = v_user, issued_at = now() where number = v_number;
 -- Keep any already published card's server-owned identity current.
 update public.gamelink_public_cards set founder_number = v_number where id = v_user;
 return public.gamelink_founder_status();
end;
$$;
revoke all on function public.gamelink_claim_founder() from public, anon;
grant execute on function public.gamelink_claim_founder() to authenticated;

create or replace function public.gamelink_stamp_founder()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 -- Never trust a number, ownership flag or claim embedded in client JSON.
 select number into new.founder_number from public.gamelink_founder_slots where user_id = new.id;
 if new.card->>'design' = 'founder' and new.founder_number is null then
  raise exception 'Claim a Founding Player edition before publishing this design.';
 end if;
 new.card := new.card - 'founder_number' - 'founderNumber';
 return new;
end;
$$;
revoke all on function public.gamelink_stamp_founder() from public, anon, authenticated;
drop trigger if exists gamelink_stamp_founder on public.gamelink_public_cards;
create trigger gamelink_stamp_founder before insert or update on public.gamelink_public_cards
 for each row execute function public.gamelink_stamp_founder();
commit;
