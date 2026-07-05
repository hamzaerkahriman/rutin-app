-- Rutin — Gerçek bildirim sistemi
-- Kaynak: bu özellik 0005'ten SONRA eklendi.
--
-- `notifications` tablosu 0001'den beri vardı ama hiç doldurulmuyordu.
-- Bu dosya trigger'lar ekleyerek görev atama, devir talebi, not ekleme ve
-- workspace daveti olaylarında otomatik bildirim satırı oluşturur.
-- Trigger fonksiyonları SECURITY DEFINER olduğu için (tablo sahibi olarak
-- çalıştıkları için) RLS'i bypass eder — ayrı bir INSERT politikası gerekmez.
-- Sadece kendi trigger/fonksiyon/kolonlarını drop/create eder, mevcut
-- verilere dokunmaz.

drop trigger if exists trg_notify_task_assigned on public.tasks;
drop function if exists public.notify_task_assigned();
drop trigger if exists trg_notify_task_handoff_received on public.task_handoffs;
drop function if exists public.notify_task_handoff_received();
drop trigger if exists trg_notify_task_note_added on public.task_notes;
drop function if exists public.notify_task_note_added();
drop trigger if exists trg_notify_workspace_invite_received on public.workspace_invites;
drop function if exists public.notify_workspace_invite_received();

alter table public.notifications drop column if exists message;
alter table public.notifications add column message text;

-- Görev atandı (yeni görev veya atanan kişi değişti — ör. devir kabulü).
-- Kendi kendine atama/devir kabulünde bildirim gitmez (auth.uid() = yeni atanan).
create or replace function public.notify_task_assigned()
returns trigger as $$
declare
  actor_name text;
begin
  if new.assigned_to is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.assigned_to is not distinct from new.assigned_to then
    return new;
  end if;
  if new.assigned_to = auth.uid() then
    return new;
  end if;

  select name into actor_name from public.users where id = auth.uid();
  insert into public.notifications (user_id, type, task_id, message)
  values (
    new.assigned_to,
    'task_assigned',
    new.id,
    format('%s sana "%s" görevini atadı', coalesce(actor_name, 'Bir kullanıcı'), new.title)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_notify_task_assigned
  after insert or update of assigned_to on public.tasks
  for each row execute function public.notify_task_assigned();

-- Devir talebi geldi (accepted_status='pending' ile oluşturulan her devir).
create or replace function public.notify_task_handoff_received()
returns trigger as $$
declare
  actor_name text;
  task_title text;
begin
  if new.accepted_status <> 'pending' then
    return new;
  end if;

  select name into actor_name from public.users where id = new.from_user_id;
  select title into task_title from public.tasks where id = new.task_id;

  insert into public.notifications (user_id, type, task_id, message)
  values (
    new.to_user_id,
    'task_handoff_received',
    new.task_id,
    format('%s "%s" görevini sana devretmek istiyor', coalesce(actor_name, 'Bir kullanıcı'), coalesce(task_title, 'bir görev'))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_notify_task_handoff_received
  after insert on public.task_handoffs
  for each row execute function public.notify_task_handoff_received();

-- Göreve not eklendi (görevin atanan kişisine ve oluşturana; devir notları
-- hariç — o zaten kendi devir bildirimini üretiyor, notu yazan kişiye de
-- bildirim gitmez).
create or replace function public.notify_task_note_added()
returns trigger as $$
declare
  actor_name text;
  task_title text;
  task_assignee uuid;
  task_creator uuid;
  targets uuid[];
  target uuid;
begin
  if new.type = 'handoff_note' then
    return new;
  end if;

  select name into actor_name from public.users where id = new.user_id;
  select title, assigned_to, created_by into task_title, task_assignee, task_creator
  from public.tasks where id = new.task_id;

  targets := array(
    select distinct u from unnest(array[task_assignee, task_creator]) as u
    where u is not null and u <> new.user_id
  );

  foreach target in array targets loop
    insert into public.notifications (user_id, type, task_id, message)
    values (
      target,
      'task_note_added',
      new.task_id,
      format('%s "%s" görevine not ekledi', coalesce(actor_name, 'Bir kullanıcı'), coalesce(task_title, 'bir görev'))
    );
  end loop;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_notify_task_note_added
  after insert on public.task_notes
  for each row execute function public.notify_task_note_added();

-- Workspace daveti geldi (sadece davet edilen e-posta zaten bir hesaba
-- sahipse — hesabı olmayan davetler zaten Dashboard'daki e-posta eşleşmeli
-- sorgu ile ayrıca gösteriliyor, bkz. AppStore myInvites).
create or replace function public.notify_workspace_invite_received()
returns trigger as $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from public.users where lower(email) = lower(new.email);
  if target_user_id is null then
    return new;
  end if;

  insert into public.notifications (user_id, type, task_id, message)
  values (
    target_user_id,
    'workspace_invite_received',
    null,
    format('Bir workspace''e %s olarak davet edildin', new.role)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_notify_workspace_invite_received
  after insert on public.workspace_invites
  for each row execute function public.notify_workspace_invite_received();

-- notifications tablosunu da realtime publication'ına ekle (canlı zil rozeti için).
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime drop table public.notifications;
  end if;
  alter publication supabase_realtime add table public.notifications;
end $$;

alter table public.notifications replica identity full;
