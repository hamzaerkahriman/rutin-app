-- Rutin — Kişiler arası mesajlaşma (DM)
-- Kaynak: bu özellik 0007'den SONRA eklendi.
--
-- İki kişi arasında birebir sohbet: her workspace içinde iki kullanıcı
-- arasında tek bir conversation olur (unique constraint), mesajlar ona bağlı.
-- Bu dosya sadece kendi tablolarını/trigger'ını drop/create eder, mevcut
-- verilere dokunmaz.

-- Not: "drop trigger ... on public.messages" burada kasıtlı olarak yok —
-- tablo henüz yoksa DROP TRIGGER IF EXISTS bile tabloyu bulamayınca hata
-- verir. "drop table ... cascade" zaten trigger'ı da birlikte siler.
drop function if exists public.notify_message_received();
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;

-- user_one_id < user_two_id olacak şekilde saklanır (client bunu garanti
-- eder) — böylece "A-B" ve "B-A" için ayrı satır oluşmaz.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_one_id uuid not null references public.users(id) on delete cascade,
  user_two_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_one_id < user_two_id),
  unique (workspace_id, user_one_id, user_two_id)
);

create index on public.conversations (user_one_id);
create index on public.conversations (user_two_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations_select_participant" on public.conversations
  for select using (auth.uid() = user_one_id or auth.uid() = user_two_id);

create policy "conversations_insert_participant" on public.conversations
  for insert with check (
    (auth.uid() = user_one_id or auth.uid() = user_two_id)
    and public.is_workspace_member(workspace_id)
  );

create policy "messages_select_participant" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_one_id = auth.uid() or c.user_two_id = auth.uid())
    )
  );

create policy "messages_insert_participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_one_id = auth.uid() or c.user_two_id = auth.uid())
    )
  );

-- Okundu işaretleme için (karşı tarafın mesajını "read_at" ile güncellemek)
create policy "messages_update_participant" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_one_id = auth.uid() or c.user_two_id = auth.uid())
    )
  );

-- notifications tablosuna sohbet referansı (hangi konuşmaya gideceğini bilmek için)
alter table public.notifications drop column if exists conversation_id;
alter table public.notifications
  add column conversation_id uuid references public.conversations(id) on delete cascade;

create or replace function public.notify_message_received()
returns trigger as $$
declare
  actor_name text;
  convo record;
  recipient uuid;
begin
  select * into convo from public.conversations where id = new.conversation_id;
  if convo.id is null then
    return new;
  end if;
  recipient := case when convo.user_one_id = new.sender_id then convo.user_two_id else convo.user_one_id end;

  select name into actor_name from public.users where id = new.sender_id;

  insert into public.notifications (user_id, type, task_id, conversation_id, message)
  values (
    recipient,
    'message_received',
    null,
    new.conversation_id,
    format('%s sana bir mesaj gönderdi', coalesce(actor_name, 'Bir kullanıcı'))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_notify_message_received
  after insert on public.messages
  for each row execute function public.notify_message_received();

-- Realtime: sohbet ve mesajlar için canlı senkronizasyon.
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime drop table public.conversations;
  end if;
  alter publication supabase_realtime add table public.conversations;

  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime drop table public.messages;
  end if;
  alter publication supabase_realtime add table public.messages;
end $$;

alter table public.conversations replica identity full;
alter table public.messages replica identity full;
