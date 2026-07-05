-- Rutin — Güvenlik sağlamlaştırma turu
-- Kaynak: bu dosya 0010'dan SONRA, genel bir güvenlik/RLS denetimi
-- sırasında bulunan 2 gerçek boşluğu kapatıyor. Sadece kendi
-- trigger/fonksiyonlarını drop/create eder, mevcut verilere dokunmaz.

-- 1) messages: "messages_update_participant" politikasında WITH CHECK yok,
-- bu da herhangi bir konuşma katılımcısının (sadece read_at işaretlemek
-- yerine) KARŞI TARAFIN mesajının content'ini ya da sender_id'sini
-- değiştirebilmesine izin veriyordu (mesaj tahrifatı/sahtecilik). RLS
-- kolon bazlı kısıtlama yapamadığı için bunu bir trigger ile kapatıyoruz:
-- content/sender_id/conversation_id/created_at kim güncellerse güncellesin
-- değiştirilemez, sadece read_at serbest kalır.
drop trigger if exists trg_lock_message_fields on public.messages;
drop function if exists public.lock_message_fields();

create or replace function public.lock_message_fields()
returns trigger as $$
begin
  if new.content is distinct from old.content
    or new.sender_id is distinct from old.sender_id
    or new.conversation_id is distinct from old.conversation_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Mesaj içeriği/göndereni değiştirilemez — sadece read_at güncellenebilir';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_lock_message_fields
  before update on public.messages
  for each row execute function public.lock_message_fields();

-- 2) tasks: "tasks_update_scope" politikasının WITH CHECK'i sadece yeni
-- workspace_id'ye üyeliği doğruluyordu, workspace_id'nin HİÇ
-- değişmediğini değil — yani bir görevin atanan/oluşturan kişisi, üyesi
-- olduğu BAŞKA bir workspace'e o görevi taşıyabiliyordu (uygulama arayüzünde
-- böyle bir özellik hiç yok, sadece doğrudan API çağrısıyla mümkündü).
-- Görev taşıma diye bir özellik olmadığı için workspace_id'yi tamamen
-- değişmez kılıyoruz.
drop trigger if exists trg_lock_task_workspace on public.tasks;
drop function if exists public.lock_task_workspace();

create or replace function public.lock_task_workspace()
returns trigger as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'Bir görevin workspace''i değiştirilemez';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_lock_task_workspace
  before update on public.tasks
  for each row execute function public.lock_task_workspace();
