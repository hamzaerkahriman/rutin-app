-- Rutin — Realtime publication
-- Kaynak: bu özellik 0004'ten SONRA eklendi.
--
-- Supabase Realtime, `supabase_realtime` publication'ına eklenmemiş bir
-- tablodaki değişiklikleri client'lara yayınlamaz. Bu dosya, canlı
-- senkronizasyon istediğimiz tabloları publication'a ekler. Idempotent:
-- her tablo eklenmeden önce mevcutsa çıkarılır (zaten ekliyse hata vermemesi
-- için), sonra yeniden eklenir.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'tasks',
    'task_checklists',
    'task_notes',
    'task_handoffs',
    'workspace_members',
    'workspace_invites'
  ]
  loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', tbl);
    end if;
    execute format('alter publication supabase_realtime add table public.%I', tbl);
  end loop;
end $$;

-- task_notes ve task_handoffs'ta workspace_id kolonu yok; RLS zaten
-- postgres_changes olaylarını filtreliyor ama replica identity FULL,
-- UPDATE/DELETE olaylarında eski satırın (old record) tüm kolonlarıyla
-- gelmesini sağlar (aksi halde sadece primary key gelir).
alter table public.tasks replica identity full;
alter table public.task_checklists replica identity full;
alter table public.task_notes replica identity full;
alter table public.task_handoffs replica identity full;
alter table public.workspace_members replica identity full;
alter table public.workspace_invites replica identity full;
