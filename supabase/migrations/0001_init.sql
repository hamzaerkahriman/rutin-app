-- Rutin — İlk şema
-- Kaynak: rutin_urun_dokumani_v2.md §14
-- Uygulamak için: supabase db push  (veya Supabase Studio SQL Editor'a yapıştır)
--
-- Bu dosya idempotenttir: baştaki DROP'lar sayesinde ne zaman/kaç kez
-- çalıştırılırsa çalıştırılsın hep aynı temiz şemayı üretir. Proje henüz
-- geliştirme aşamasında olduğu için (sadece test hesapları var) bu güvenlidir.

drop table if exists public.notifications cascade;
drop table if exists public.motivation_contents cascade;
drop table if exists public.daily_saves cascade;
drop table if exists public.task_handoffs cascade;
drop table if exists public.task_notes cascade;
drop table if exists public.task_checklists cascade;
drop table if exists public.tasks cascade;
drop table if exists public.workspace_members cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.users cascade;
drop function if exists public.is_workspace_member(uuid);
drop function if exists public.workspace_role(uuid);

create extension if not exists pgcrypto;

-- Kullanıcılar (Supabase Auth ile birebir eşleşir)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Workspace'ler
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id),
  type text not null check (type in ('personal', 'team')) default 'team',
  created_at timestamptz not null default now()
);

-- Workspace üyelikleri
create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')) default 'member',
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- Görevler
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  category text,
  status text not null check (status in (
    'pending', 'started', 'in_progress', 'in_review',
    'handed_off', 'completed', 'failed', 'postponed', 'cancelled'
  )) default 'pending',
  priority text not null check (priority in ('low', 'medium', 'high', 'critical')) default 'medium',
  progress int not null default 0 check (progress between 0 and 100),
  progress_mode text not null check (progress_mode in ('manual', 'checklist', 'subtask')) default 'checklist',
  assigned_to uuid references public.users(id),
  created_by uuid not null references public.users(id),
  start_date date,
  due_date date,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.tasks (workspace_id, status);
create index on public.tasks (assigned_to);
create index on public.tasks (due_date);

-- Checklist maddeleri
create table public.task_checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  "order" int not null default 0
);

-- Notlar / mesajlar
create table public.task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id),
  type text not null check (type in (
    'personal', 'team', 'handoff_note', 'manager_note', 'daily_note', 'blocker_note'
  )),
  content text not null,
  created_at timestamptz not null default now()
);

-- Görev devirleri
create table public.task_handoffs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  from_user_id uuid not null references public.users(id),
  to_user_id uuid not null references public.users(id),
  current_status text not null,
  done_so_far text not null,
  remaining_work text not null,
  caution_notes text,
  new_priority text,
  new_due_date date,
  accepted_status text not null check (accepted_status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Günlük save
create table public.daily_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  workspace_id uuid not null references public.workspaces(id),
  date date not null,
  completed_tasks int not null default 0,
  failed_tasks int not null default 0,
  postponed_tasks int not null default 0,
  success_rate numeric(5,2) not null default 0,
  daily_note text,
  created_at timestamptz not null default now(),
  unique (user_id, workspace_id, date)
);

-- Motivasyon içerikleri
create table public.motivation_contents (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  quote text not null,
  category text,
  created_at timestamptz not null default now()
);

-- Bildirimler
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  task_id uuid references public.tasks(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Row Level Security
-- Prensip (§14): kullanıcı sadece üyesi olduğu workspace'e ait
-- kayıtlara erişebilir; daily_saves sadece kendi kaydı; workspaces
-- sadece üyeler görebilir, sadece owner günceller/siler.
-- =========================================================

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_checklists enable row level security;
alter table public.task_notes enable row level security;
alter table public.task_handoffs enable row level security;
alter table public.daily_saves enable row level security;
alter table public.motivation_contents enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$ language sql stable security definer;

create or replace function public.workspace_role(ws_id uuid)
returns text as $$
  select role from public.workspace_members
  where workspace_id = ws_id and user_id = auth.uid()
  limit 1;
$$ language sql stable security definer;

-- users: herkes kendi profilini ve aynı workspace'teki üyeleri görebilir/güncelleyebilir
create policy "users_select_self_or_workspace_peers" on public.users
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.workspace_members wm1
      join public.workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
      where wm1.user_id = auth.uid() and wm2.user_id = public.users.id
    )
  );
create policy "users_update_self" on public.users for update using (id = auth.uid());
create policy "users_insert_self" on public.users for insert with check (id = auth.uid());

-- workspaces: sadece üyeler görebilir, sadece owner günceller/siler
-- (owner_id = auth.uid() de kabul edilir: workspace insert edildiği anda
-- henüz workspace_members satırı yoktur, owner kendi oluşturduğunu görebilmeli)
create policy "workspaces_select_members" on public.workspaces
  for select using (public.is_workspace_member(id) or owner_id = auth.uid());
create policy "workspaces_insert_owner" on public.workspaces
  for insert with check (owner_id = auth.uid());
create policy "workspaces_update_owner" on public.workspaces
  for update using (owner_id = auth.uid());
create policy "workspaces_delete_owner" on public.workspaces
  for delete using (owner_id = auth.uid());

-- workspace_members: üyeler birbirini görebilir; owner/admin ekleyip çıkarabilir
-- (workspace sahibi de kendi workspace'ine ilk üyelik satırını ekleyebilmeli —
-- o an için workspace_members'ta henüz hiç satır yoktur, workspace_role() null döner)
create policy "members_select_workspace" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy "members_write_owner_admin" on public.workspace_members
  for all using (
    public.workspace_role(workspace_id) in ('owner', 'admin')
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  )
  with check (
    public.workspace_role(workspace_id) in ('owner', 'admin')
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

-- tasks: workspace üyeleri görebilir; owner/admin hepsini düzenler,
-- member sadece kendi oluşturduğu / kendisine atanan görevi düzenler
create policy "tasks_select_workspace" on public.tasks
  for select using (public.is_workspace_member(workspace_id));
create policy "tasks_insert_workspace" on public.tasks
  for insert with check (public.is_workspace_member(workspace_id));
-- with check burada bilinçli olarak sadece workspace üyeliğini doğruluyor
-- (assigned_to = auth.uid() değil): aksi halde bir görevi devreden kişi,
-- yeni satırda assigned_to artık kendisi olmadığı için with check'e takılır
-- ve devir işlemi (assigned_to değişikliği) engellenir.
create policy "tasks_update_scope" on public.tasks
  for update using (
    public.workspace_role(workspace_id) in ('owner', 'admin')
    or created_by = auth.uid()
    or assigned_to = auth.uid()
  )
  with check (public.is_workspace_member(workspace_id));
create policy "tasks_delete_owner_admin" on public.tasks
  for delete using (public.workspace_role(workspace_id) in ('owner', 'admin'));

-- task_checklists / task_notes / task_handoffs: görevin workspace'ine üye olan erişir
create policy "checklists_all_workspace" on public.task_checklists
  for all using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  ) with check (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );

create policy "notes_select_workspace" on public.task_notes
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );
create policy "notes_insert_workspace" on public.task_notes
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );

create policy "handoffs_all_workspace" on public.task_handoffs
  for all using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  ) with check (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );

-- daily_saves: kullanıcı sadece kendi kaydını okur/yazar;
-- owner/admin ekip raporunda workspace'teki tüm kayıtları okuyabilir
create policy "daily_saves_select_self_or_manager" on public.daily_saves
  for select using (
    user_id = auth.uid()
    or public.workspace_role(workspace_id) in ('owner', 'admin')
  );
create policy "daily_saves_write_self" on public.daily_saves
  for insert with check (user_id = auth.uid());
create policy "daily_saves_update_self" on public.daily_saves
  for update using (user_id = auth.uid());

-- motivation_contents: herkes okuyabilir (statik içerik havuzu)
create policy "motivation_select_all" on public.motivation_contents
  for select using (true);

-- notifications: sadece kendi bildirimleri
create policy "notifications_select_self" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_self" on public.notifications
  for update using (user_id = auth.uid());

-- =========================================================
-- Seed: motivasyon içerik havuzu (§6.1 örnek cümleler)
-- =========================================================
insert into public.motivation_contents (image_url, quote, category) values
  ('', 'Bugün küçük bir adım, yarın büyük bir sistem olur.', 'discipline'),
  ('', 'Yarım kalan işler değil, tamamlanan rutinler seni büyütür.', 'discipline'),
  ('', 'Disiplin, motivasyonun olmadığı günlerde başlar.', 'discipline'),
  ('', 'Bugün sadece başla. Devamı sistemin işi.', 'discipline'),
  ('', 'Bir işi bitirmek, zihinde yer açmaktır.', 'discipline'),
  ('', 'İlerlemek, mükemmel olmaktan daha değerlidir.', 'discipline'),
  ('', 'Kaldığın yeri bil, oradan devam et.', 'discipline');
