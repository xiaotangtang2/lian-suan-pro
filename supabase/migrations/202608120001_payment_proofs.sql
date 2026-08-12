-- 付款凭证：私有存储、订单审核字段和管理员驳回流程
alter table public.membership_orders
  add column if not exists proof_path text,
  add column if not exists proof_uploaded_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists rejected_at timestamptz;

alter table public.membership_orders drop constraint if exists membership_orders_status_check;
alter table public.membership_orders
  add constraint membership_orders_status_check
  check (status in ('pending', 'paid', 'cancelled', 'rejected'));

-- 新提交的订单必须带有当前用户目录下的付款凭证。
drop policy if exists "Users can insert own orders" on public.membership_orders;
create policy "Users can insert own orders"
  on public.membership_orders for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and proof_path is not null
    and proof_path like auth.uid()::text || '/%'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own payment proofs" on storage.objects;
create policy "Users upload own payment proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read own payment proofs" on storage.objects;
create policy "Users read own payment proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "Users delete own unused payment proofs" on storage.objects;
create policy "Users delete own unused payment proofs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.reject_membership_order(p_order_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() is not true then
    raise exception '无权限：仅管理员可驳回订单';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception '请填写驳回原因';
  end if;

  update public.membership_orders
     set status = 'rejected',
         rejection_reason = trim(p_reason),
         rejected_at = now()
   where id = p_order_id and status = 'pending';

  if not found then raise exception '订单不存在或当前状态不可驳回'; end if;
  return true;
end;
$$;

grant execute on function public.reject_membership_order(uuid, text) to authenticated;

