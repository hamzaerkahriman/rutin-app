-- Rutin — Workspace davetleri
-- Kaynak: bu özellik 0001_init.sql'den SONRA eklendi.
--
-- Bu dosya SADECE yeni eklenen parçaları içerir (workspace_invites tablosu +
-- RLS + accept/decline fonksiyonları). 0001_init.sql'in aksine mevcut
-- tabloları (users, workspaces, tasks, ...) DROP ETMEZ — üretimde/testte
-- zaten veri olan bir projeye güvenle uygulanabilir. Sadece kendi tablosu ve
-- fonksiyonları için idempotenttir (drop if exists yalnızca bunlara özel).

drop table if exists public.workspace_invites cascade;
drop function if exists public.accept_workspace_invite(uuid);
drop function if exists public.decline_workspace_invite(uuid);

-- Workspace davetleri: hesabı olmayan bir e-postaya da davet gönderilebilir
-- (workspace_invites.email public.users'a referans vermez, kasıtlı olarak).
create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member', 'viewer')) default 'member',
  invited_by uuid not null references public.users(id),
  status text not null check (status in ('pending', 'accepted', 'declined', 'cancelled')) default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index workspace_invites_pending_unique
  on public.workspace_invites (workspace_id, lower(email))
  where status = 'pending';

alter table public.workspace_invites enable row level security;

-- workspace_invites: owner/admin kendi workspace'inin davetlerini görüp
-- gönderebilir/iptal edebilir; davet edilen kişi (e-postası JWT'deki email
-- claim'iyle eşleşen) kendine gelen davetleri görebilir.
create policy "invites_select_scope" on public.workspace_invites
  for select using (
    public.workspace_role(workspace_id) in ('owner', 'admin')
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "invites_insert_owner_admin" on public.workspace_invites
  for insert with check (
    public.workspace_role(workspace_id) in ('owner', 'admin')
    and invited_by = auth.uid()
  );
create policy "invites_update_owner_admin" on public.workspace_invites
  for update using (public.workspace_role(workspace_id) in ('owner', 'admin'));

-- Davet kabul/red işlemleri, workspace_members'a satır eklemek gibi davet
-- edilen kişinin normalde yetkisi olmayan bir işlem içerdiği için
-- SECURITY DEFINER fonksiyon üzerinden yapılır.
create or replace function public.accept_workspace_invite(invite_id uuid)
returns void as $$
declare
  inv public.workspace_invites%rowtype;
begin
  select * into inv from public.workspace_invites where id = invite_id;

  if inv.id is null then
    raise exception 'Davet bulunamadı';
  end if;
  if lower(inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Bu davet size ait değil';
  end if;
  if inv.status <> 'pending' then
    raise exception 'Bu davet artık geçerli değil';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invites
  set status = 'accepted', resolved_at = now()
  where id = invite_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.decline_workspace_invite(invite_id uuid)
returns void as $$
declare
  inv public.workspace_invites%rowtype;
begin
  select * into inv from public.workspace_invites where id = invite_id;

  if inv.id is null then
    raise exception 'Davet bulunamadı';
  end if;
  if lower(inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Bu davet size ait değil';
  end if;
  if inv.status <> 'pending' then
    raise exception 'Bu davet artık geçerli değil';
  end if;

  update public.workspace_invites
  set status = 'declined', resolved_at = now()
  where id = invite_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.accept_workspace_invite(uuid) to authenticated;
grant execute on function public.decline_workspace_invite(uuid) to authenticated;
