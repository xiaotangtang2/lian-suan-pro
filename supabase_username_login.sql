-- 在 Supabase Dashboard > SQL Editor > New Query 中执行一次即可
-- 功能：自定义账号名登录（注册时设置账号名，登录时可用账号名或邮箱）

-- 1. profiles 增加账号名字段
alter table public.profiles add column if not exists username text;

-- 账号名唯一（大小写不敏感，空账号名不参与唯一约束）
drop index if exists profiles_username_unique;
create unique index profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

-- 2. 注册时把账号名写进 profiles（复用已有的 handle_new_user 触发器）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, is_member)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'username', ''),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. 检查账号名是否已被占用（注册时用）
create or replace function public.username_taken(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where username is not null and lower(username) = lower(p_username)
  );
$$;

grant execute on function public.username_taken(text) to anon, authenticated;

-- 4. 根据账号名找到对应邮箱（账号登录时用）
create or replace function public.find_login_email(p_account text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email
  from public.profiles
  where username is not null and lower(username) = lower(p_account)
  limit 1;
$$;

grant execute on function public.find_login_email(text) to anon, authenticated;