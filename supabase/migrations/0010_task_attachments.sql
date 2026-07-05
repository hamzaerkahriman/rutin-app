-- Rutin — Görev eklentileri: dosya yükleme + sesli not
-- Kaynak: bu özellik 0009'dan SONRA eklendi.
--
-- Bir görevin altına fotoğraf, herhangi bir dosya ya da kaydedilmiş sesli not
-- eklenebilir. Dosyalar Storage'da özel (public=false) bir bucket'ta durur,
-- gerçek erişim `task_attachments` tablosundaki RLS + storage.objects
-- politikalarıyla kontrol edilir (workspace üyesi olmayan biri ne satırı ne
-- de dosyayı görebilir). Path convention: `{workspace_id}/{task_id}/{uuid}_{dosya_adı}`
-- — storage politikaları bu path'in ilk segmentini (workspace_id) okuyup
-- workspace üyeliğini kontrol eder.
-- Sadece kendi tablosunu/bucket'ını/politikalarını drop/create eder, mevcut
-- verilere dokunmaz.

drop policy if exists "task_attachments_select" on storage.objects;
drop policy if exists "task_attachments_insert" on storage.objects;
drop policy if exists "task_attachments_delete" on storage.objects;

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

create policy "task_attachments_select" on storage.objects
  for select using (
    bucket_id = 'task-attachments'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

create policy "task_attachments_insert" on storage.objects
  for insert with check (
    bucket_id = 'task-attachments'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

create policy "task_attachments_delete" on storage.objects
  for delete using (
    bucket_id = 'task-attachments'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null references public.users(id),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  kind text not null check (kind in ('image', 'file', 'voice')),
  size_bytes bigint,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create index on public.task_attachments (task_id);

alter table public.task_attachments enable row level security;

create policy "attachments_select_workspace" on public.task_attachments
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );

create policy "attachments_insert_workspace" on public.task_attachments
  for insert with check (
    uploaded_by = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );

-- Herhangi bir workspace üyesi eski/yanlış bir eki silebilir (checklist'lerle
-- aynı güven modeli — sadece yükleyen değil, ekip yönetebilir).
create policy "attachments_delete_workspace" on public.task_attachments
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_attachments'
  ) then
    alter publication supabase_realtime drop table public.task_attachments;
  end if;
  alter publication supabase_realtime add table public.task_attachments;
end $$;

alter table public.task_attachments replica identity full;
