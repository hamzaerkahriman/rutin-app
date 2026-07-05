-- Rutin — Viewer rolünü RLS seviyesinde uygula
-- Kaynak: PRD'de Owner/Admin/Member/Viewer rolleri tanımlı ama Viewer sadece
-- davet ekranında bir etiketti — tasks/checklists/notes/handoffs/attachments
-- politikaları herhangi bir workspace üyesine (Viewer dahil) yazma izni
-- veriyordu. Viewer'ı "salt okunur" kabul ediyoruz: workspace'in
-- görev/checklist/not/devir/ek verilerini görebilir ama oluşturamaz,
-- güncelleyemez, silemez. Sadece kendi tablo/politikalarını drop/create
-- eder, mevcut verilere dokunmaz.

-- tasks: insert ve update artık Viewer'ı hariç tutuyor
drop policy if exists "tasks_insert_workspace" on public.tasks;
create policy "tasks_insert_workspace" on public.tasks
  for insert with check (
    public.is_workspace_member(workspace_id)
    and public.workspace_role(workspace_id) <> 'viewer'
  );

drop policy if exists "tasks_update_scope" on public.tasks;
create policy "tasks_update_scope" on public.tasks
  for update using (
    public.workspace_role(workspace_id) <> 'viewer'
    and (
      public.workspace_role(workspace_id) in ('owner', 'admin')
      or created_by = auth.uid()
      or assigned_to = auth.uid()
    )
  )
  with check (public.is_workspace_member(workspace_id));

-- task_checklists: tek "for all" politikası select'i de kapsıyordu, bu yüzden
-- select'i ayrı (herkese açık) bir politikaya taşıyıp "all"ı Viewer'a kapatıyoruz.
drop policy if exists "checklists_all_workspace" on public.task_checklists;
create policy "checklists_select_workspace" on public.task_checklists
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );
create policy "checklists_mutate_non_viewer" on public.task_checklists
  for all using (
    exists (select 1 from public.tasks t where t.id = task_id and public.workspace_role(t.workspace_id) <> 'viewer')
  ) with check (
    exists (select 1 from public.tasks t where t.id = task_id and public.workspace_role(t.workspace_id) <> 'viewer')
  );

-- task_notes: insert Viewer'a kapatılıyor (select zaten ayrı bir politikaydı)
drop policy if exists "notes_insert_workspace" on public.task_notes;
create policy "notes_insert_workspace" on public.task_notes
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and public.workspace_role(t.workspace_id) <> 'viewer')
  );

-- task_handoffs: aynı select/mutate ayrımı — devir talebi açmak bir "düzenleme"
-- eylemi, kabul/red zaten accept_task_handoff/decline_task_handoff RPC'leri
-- üzerinden security definer olarak yürüyor, bu politikadan etkilenmiyor.
drop policy if exists "handoffs_all_workspace" on public.task_handoffs;
create policy "handoffs_select_workspace" on public.task_handoffs
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id))
  );
create policy "handoffs_mutate_non_viewer" on public.task_handoffs
  for all using (
    exists (select 1 from public.tasks t where t.id = task_id and public.workspace_role(t.workspace_id) <> 'viewer')
  ) with check (
    exists (select 1 from public.tasks t where t.id = task_id and public.workspace_role(t.workspace_id) <> 'viewer')
  );

-- task_attachments: aynı mantık — dosya/sesli not eklemek/silmek de düzenleme sayılır
drop policy if exists "attachments_insert_workspace" on public.task_attachments;
create policy "attachments_insert_workspace" on public.task_attachments
  for insert with check (
    uploaded_by = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and public.workspace_role(t.workspace_id) <> 'viewer')
  );

drop policy if exists "attachments_delete_workspace" on public.task_attachments;
create policy "attachments_delete_workspace" on public.task_attachments
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_id and public.workspace_role(t.workspace_id) <> 'viewer')
  );
