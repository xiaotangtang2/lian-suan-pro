-- 在 Supabase SQL Editor 中执行此文件
-- 路径: Supabase Dashboard > SQL Editor > New Query

-- 创建 profiles 表，与 auth.users 通过 id 关联
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  is_member   boolean default false,
  created_at  timestamp with time zone default now()
);

-- 启用 RLS（行级安全）
alter table profiles enable row level security;

-- 用户只能读取自己的 profile
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

-- 用户只能更新自己的 profile（但不能改 id 和 email）
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- 注册时自动创建 profile 记录（可选：用 trigger 自动插入）
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, is_member)
  values (new.id, new.email, false);
  return new;
end;
$$ language plpgsql security definer;

-- 当 auth.users 新增一行时触发
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();