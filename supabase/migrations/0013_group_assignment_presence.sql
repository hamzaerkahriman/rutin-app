-- Rutin — Grup görev ataması + üye "şu an aktif" göstergesi
-- Kaynak: bu özellik 0012'den SONRA eklendi.
--
-- 1) Bir göreve tek kişi yerine BİRDEN FAZLA kişi atanabilmesi (grup çalışması).
--    `tasks.assigned_to` geriye dönük uyumluluk için "birincil atanan" olarak
--    kalıyor (mevcut bildirim/devir/RLS mantığı ona göre kurulu) — yeni
--    `task_assignees` tablosu tüm atananları (birincil dahil) tutuyor.
-- 2) Admin'e "şu an kim aktif çalışıyor" göstermek için workspace_members'a
--    last_active_at eklenip üyenin kendi satırını (sadece heartbeat için)
--    periyodik güncelleyebilmesi sağlanıyor.

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

alter table public.task_assignees enable row level security;

drop policy if exists "task_assignees_select_workspace" on public.task_assignees;
create policy "task_assignees_select_workspace" on public.task_assignees
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );

drop policy if exists "task_assignees_mutate_non_viewer" on public.task_assignees;
create policy "task_assignees_mutate_non_viewer" on public.task_assignees
  for all using (
    exists (select 1 from public.tasks t where t.id = task_id and public.workspace_role(t.workspace_id) <> 'viewer')
  ) with check (
    exists (select 1 from public.tasks t where t.id = task_id and public.workspace_role(t.workspace_id) <> 'viewer')
  );

-- Var olan görevlerin birincil atananını yeni tabloya taşı (geriye dönük dolgu).
insert into public.task_assignees (task_id, user_id)
select id, assigned_to from public.tasks where assigned_to is not null
on conflict do nothing;

-- Grup üyesi eklendiğinde (birincil atanan hariç — o zaten
-- notify_task_assigned ile bildirim alıyor) bildirim gönder.
create or replace function public.notify_task_group_assignee_added()
returns trigger as $$
declare
  actor_name text;
  task_title text;
  task_primary uuid;
begin
  if new.user_id = auth.uid() then
    return new;
  end if;
  select title, assigned_to into task_title, task_primary from public.tasks where id = new.task_id;
  if task_primary is not distinct from new.user_id then
    return new;
  end if;

  select name into actor_name from public.users where id = auth.uid();
  insert into public.notifications (user_id, type, task_id, message)
  values (
    new.user_id,
    'task_assigned',
    new.task_id,
    format('%s seni "%s" görevine ekip üyesi olarak ekledi', coalesce(actor_name, 'Bir kullanıcı'), coalesce(task_title, 'bir görev'))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_task_group_assignee_added on public.task_assignees;
create trigger trg_notify_task_group_assignee_added
  after insert on public.task_assignees
  for each row execute function public.notify_task_group_assignee_added();

-- Devir kabul edildiğinde yeni birincil atanan da grup listesine eklensin
-- (aksi halde devri kabul eden kişi task_assignees'te görünmeyip grup
-- listesi eski birincil atananla tutarsız kalırdı).
create or replace function public.accept_task_handoff(handoff_id uuid)
returns void as $$
declare
  h public.task_handoffs%rowtype;
begin
  select * into h from public.task_handoffs where id = handoff_id;

  if h.id is null then
    raise exception 'Devir bulunamadı';
  end if;
  if h.to_user_id <> auth.uid() then
    raise exception 'Bu devir size ait değil';
  end if;
  if h.accepted_status <> 'pending' then
    raise exception 'Bu devir artık geçerli değil';
  end if;

  update public.tasks
  set assigned_to = h.to_user_id,
      status = h.current_status,
      priority = coalesce(h.new_priority, priority),
      due_date = coalesce(h.new_due_date, due_date),
      updated_at = now()
  where id = h.task_id;

  insert into public.task_assignees (task_id, user_id)
  values (h.task_id, h.to_user_id)
  on conflict do nothing;

  update public.task_handoffs
  set accepted_status = 'accepted', resolved_at = now()
  where id = handoff_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.accept_task_handoff(uuid) to authenticated;

-- Realtime publication + replica identity (diğer tablolarla aynı desen).
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_assignees'
  ) then
    alter publication supabase_realtime drop table public.task_assignees;
  end if;
  alter publication supabase_realtime add table public.task_assignees;
end $$;
alter table public.task_assignees replica identity full;

-- ---------------------------------------------------------------------
-- "Şu an aktif" göstergesi: her üye uygulama açıkken periyodik olarak
-- kendi last_active_at'ini günceller (heartbeat). Admin ekip ekranında
-- son birkaç dakika içinde heartbeat atan üyeleri "aktif" gösterir.
-- ---------------------------------------------------------------------
alter table public.workspace_members add column if not exists last_active_at timestamptz;

-- Bir üye kendi satırını güncelleyebilir (SADECE heartbeat için) — rolünü
-- ya da üyelik eşleşmesini KENDİSİ değiştiremesin diye aşağıdaki trigger
-- role/workspace_id/user_id kolonlarını owner/admin dışında kilitliyor
-- (0011'deki lock_message_fields ile aynı desen: RLS kolon bazlı
-- kısıtlama yapamadığı için bir trigger ile kapatılıyor).
drop policy if exists "members_update_self_presence" on public.workspace_members;
create policy "members_update_self_presence" on public.workspace_members
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.lock_member_managed_fields()
returns trigger as $$
begin
  if (new.role is distinct from old.role
      or new.workspace_id is distinct from old.workspace_id
      or new.user_id is distinct from old.user_id)
    and public.workspace_role(old.workspace_id) not in ('owner', 'admin')
    and not exists (select 1 from public.workspaces w where w.id = old.workspace_id and w.owner_id = auth.uid())
  then
    raise exception 'Rol veya üyelik sadece owner/admin tarafından değiştirilebilir';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_lock_member_managed_fields on public.workspace_members;
create trigger trg_lock_member_managed_fields
  before update on public.workspace_members
  for each row execute function public.lock_member_managed_fields();
