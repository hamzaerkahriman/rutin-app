-- Rutin — Zamanlanmış bildirimler (cron gerektiren türler)
-- Kaynak: bu özellik 0008'den SONRA eklendi.
--
-- 0006'daki bildirimler olay-bazlıydı (bir satır insert/update olunca tetiklenir).
-- Bu dosya, hiçbir client eylemine bağlı olmayan, zamanla tetiklenmesi gereken
-- 3 bildirim türünü ekliyor: task_due_soon / task_overdue / checklist_incomplete
-- (günlük), daily_save_reminder (günlük, akşam), weekly_report_ready (haftalık,
-- pazartesi). pg_cron uzantısını kullanır — Supabase projesinde bu uzantı
-- kapalıysa "create extension" satırı hata verir; Dashboard → Database →
-- Extensions'tan "pg_cron" açılmalı.
--
-- Idempotency: her fonksiyon, aynı gün için aynı tür+görev (veya tür+kullanıcı)
-- kombinasyonuna zaten bildirim var mı diye bakıyor — cron birden fazla kez
-- çalışsa bile (ya da migration tekrar uygulansa bile) aynı gün spam olmaz.
-- Sadece kendi fonksiyonlarını/job'larını drop/create eder, mevcut verilere
-- dokunmaz.

create extension if not exists pg_cron;

drop function if exists public.notify_task_due_and_overdue();
drop function if exists public.notify_daily_save_reminders();
drop function if exists public.notify_weekly_reports();

-- Yarın son tarihi gelen görevler → task_due_soon
-- Son tarihi geçmiş, hâlâ açık görevler → task_overdue
-- Bugün son tarihi olan, checklist modunda ve tamamlanmamış checklist'i olan
-- görevler → checklist_incomplete
create or replace function public.notify_task_due_and_overdue()
returns void as $$
begin
  insert into public.notifications (user_id, type, task_id, message)
  select
    t.assigned_to,
    'task_due_soon',
    t.id,
    format('"%s" görevinin son tarihi yarın', t.title)
  from public.tasks t
  where t.due_date = current_date + interval '1 day'
    and t.assigned_to is not null
    and t.status not in ('completed', 'failed', 'cancelled')
    and not exists (
      select 1 from public.notifications n
      where n.task_id = t.id and n.type = 'task_due_soon' and n.created_at::date = current_date
    );

  insert into public.notifications (user_id, type, task_id, message)
  select
    t.assigned_to,
    'task_overdue',
    t.id,
    format('"%s" görevinin son tarihi geçti', t.title)
  from public.tasks t
  where t.due_date < current_date
    and t.assigned_to is not null
    and t.status not in ('completed', 'failed', 'cancelled')
    and not exists (
      select 1 from public.notifications n
      where n.task_id = t.id and n.type = 'task_overdue' and n.created_at::date = current_date
    );

  insert into public.notifications (user_id, type, task_id, message)
  select
    t.assigned_to,
    'checklist_incomplete',
    t.id,
    format('"%s" görevinin checklist''i son tarihe rağmen tamamlanmadı', t.title)
  from public.tasks t
  where t.due_date = current_date
    and t.progress_mode = 'checklist'
    and t.assigned_to is not null
    and t.status not in ('completed', 'failed', 'cancelled')
    and exists (select 1 from public.task_checklists c where c.task_id = t.id and not c.completed)
    and not exists (
      select 1 from public.notifications n
      where n.task_id = t.id and n.type = 'checklist_incomplete' and n.created_at::date = current_date
    );
end;
$$ language plpgsql security definer set search_path = public;

-- Bugün henüz "gün sonu save"i yapmamış her workspace üyesine hatırlatma.
create or replace function public.notify_daily_save_reminders()
returns void as $$
begin
  insert into public.notifications (user_id, type, message)
  select distinct
    wm.user_id,
    'daily_save_reminder',
    'Bugünkü ilerlemeni kaydetmeyi unutma'
  from public.workspace_members wm
  where not exists (
    select 1 from public.daily_saves ds
    where ds.user_id = wm.user_id and ds.workspace_id = wm.workspace_id and ds.date = current_date
  )
  and not exists (
    select 1 from public.notifications n
    where n.user_id = wm.user_id and n.type = 'daily_save_reminder' and n.created_at::date = current_date
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Her hafta başı, her workspace üyesine haftalık rapor hazır bildirimi.
create or replace function public.notify_weekly_reports()
returns void as $$
begin
  insert into public.notifications (user_id, type, message)
  select distinct
    wm.user_id,
    'weekly_report_ready',
    'Haftalık raporun hazır'
  from public.workspace_members wm
  where not exists (
    select 1 from public.notifications n
    where n.user_id = wm.user_id and n.type = 'weekly_report_ready' and n.created_at::date = current_date
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Zamanlama (UTC): 06:00 due/overdue/checklist, 19:00 daily save hatırlatması,
-- pazartesi 07:00 haftalık rapor. Saatler keyfi seçildi — ihtiyaca göre
-- `select cron.schedule(...)` ile kolayca değiştirilebilir.
select cron.unschedule(jobid) from cron.job where jobname = 'rutin-due-overdue-checklist';
select cron.schedule('rutin-due-overdue-checklist', '0 6 * * *', $$select public.notify_task_due_and_overdue()$$);

select cron.unschedule(jobid) from cron.job where jobname = 'rutin-daily-save-reminder';
select cron.schedule('rutin-daily-save-reminder', '0 19 * * *', $$select public.notify_daily_save_reminders()$$);

select cron.unschedule(jobid) from cron.job where jobname = 'rutin-weekly-report';
select cron.schedule('rutin-weekly-report', '0 7 * * 1', $$select public.notify_weekly_reports()$$);
