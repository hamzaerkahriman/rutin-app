-- Rutin — Devir kabul/red onayı
-- Kaynak: bu özellik 0002'den SONRA eklendi.
--
-- task_handoffs.accepted_status kolonu 0001'den beri var ama şimdiye kadar
-- hep 'accepted' olarak insert ediliyordu (devir anında/tek yönlü uygulanıyordu).
-- Bu dosya, davet kabul/red akışıyla birebir aynı deseni kullanarak devri
-- 'pending' yapıp devralan kişinin onayına bağlıyor. Sadece kendi
-- fonksiyonlarını drop/create eder, hiçbir tabloya dokunmaz.

drop function if exists public.accept_task_handoff(uuid);
drop function if exists public.reject_task_handoff(uuid);

-- Devir kabulü: görevi devralan kişiye atar, durumu devir öncesine döndürür.
-- SECURITY DEFINER: devralan kişi normalde tasks.assigned_to'yu kendine
-- çeviremez (tasks_update_scope politikası buna izin vermez), bu yüzden
-- workspace_invites'taki accept fonksiyonuyla aynı yaklaşım kullanılıyor.
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

  update public.task_handoffs
  set accepted_status = 'accepted', resolved_at = now()
  where id = handoff_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Devir reddi: görev göndereni üzerinde kalır, durum devir öncesine döner.
create or replace function public.reject_task_handoff(handoff_id uuid)
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
  set status = h.current_status,
      updated_at = now()
  where id = h.task_id;

  update public.task_handoffs
  set accepted_status = 'rejected', resolved_at = now()
  where id = handoff_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.accept_task_handoff(uuid) to authenticated;
grant execute on function public.reject_task_handoff(uuid) to authenticated;
