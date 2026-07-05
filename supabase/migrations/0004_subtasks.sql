-- Rutin — Alt görevler
-- Kaynak: bu özellik 0003'ten SONRA eklendi.
--
-- Alt görevler ayrı bir tablo yerine `tasks` tablosunda kendine referans veren
-- bir `parent_task_id` kolonu olarak modellendi — böylece bir alt görev de
-- tam bir görev gibi kendi atanan kişisi, durumu, checklist'i ve ilerlemesi
-- olabiliyor (ürün dokümanı §6.2'deki "Alt görevler" alanı). Mevcut tasks
-- RLS politikaları zaten workspace_id üzerinden çalıştığı için ek bir
-- politika gerekmez. Sadece kendi eklediği kolonu/index'i drop eder.

alter table public.tasks drop column if exists parent_task_id;
alter table public.tasks
  add column parent_task_id uuid references public.tasks(id) on delete cascade;

create index if not exists tasks_parent_task_id_idx on public.tasks (parent_task_id);
