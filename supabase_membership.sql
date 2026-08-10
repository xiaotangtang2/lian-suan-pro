-- 在 Supabase Dashboard > SQL Editor > New Query 中执行一次即可
-- 功能：会员订单、管理员确认收款自动开通、禁止用户自行修改会员状态
-- 更新：修复管理员策略导致 RLS 递归查询失败的问题

-- 1. profiles 增加管理员标记和会员到期时间
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists member_expires_at timestamptz;

-- 1.5 管理员判断函数（security definer 绕过 RLS，避免递归）
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;
-- 1.6 判断邮箱是否已注册（登录时区分“未注册”和“密码错误”）
create or replace function public.check_email_registered(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from auth.users where lower(email) = lower(p_email));
$$;

grant execute on function public.check_email_registered(text) to anon, authenticated;

-- 2. 收紧 profiles 权限：用户只能插入自己的初始资料，不能直接改 is_member / is_admin
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and is_member is false
    and is_admin is false
    and member_expires_at is null
  );

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());


-- 2.5 注册时自动创建 profile（前端不再直接插入，避免 RLS 拦截）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_member)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. 会员订单表
create table if not exists public.membership_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  order_no text unique not null,
  plan_id text not null,
  plan_name text not null,
  amount numeric(10,2) not null check (amount > 0),
  pay_method text not null default 'wechat' check (pay_method in ('wechat','alipay')),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  confirmed_at timestamptz
);

alter table public.membership_orders enable row level security;

drop policy if exists "Users can insert own orders" on public.membership_orders;
create policy "Users can insert own orders"
  on public.membership_orders for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own orders" on public.membership_orders;
create policy "Users can read own orders"
  on public.membership_orders for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can read all orders" on public.membership_orders;
create policy "Admins can read all orders"
  on public.membership_orders for select
  using (public.is_admin());

-- 4. 管理员确认收款并开通会员（自动解锁 + 记录到期时间）
create or replace function public.confirm_membership_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.membership_orders%rowtype;
  v_expires timestamptz;
begin
  if public.is_admin() is not true then
    raise exception '无权限：仅管理员可确认收款';
  end if;

  select * into v_order
    from public.membership_orders
    where id = p_order_id;

  if not found then
    raise exception '订单不存在';
  end if;

  if v_order.status = 'paid' then
    return true;
  end if;

  v_expires := case v_order.plan_id
    when 'month' then now() + interval '1 month'
    when 'quarter' then now() + interval '3 months'
    when 'year' then now() + interval '1 year'
    else now() + interval '1 month'
  end;

  update public.membership_orders
     set status = 'paid', paid_at = now(), confirmed_at = now()
   where id = p_order_id;

  update public.profiles
     set is_member = true,
         member_expires_at = greatest(coalesce(member_expires_at, now()), now()) + (v_expires - now())
   where id = v_order.user_id;

  return true;
end;
$$;

grant execute on function public.confirm_membership_order(uuid) to authenticated;

-- 5. 把你自己的管理员邮箱填进去（替换下面的邮箱）后再执行这一句
-- update public.profiles set is_admin = true where email = '你的管理员邮箱';
