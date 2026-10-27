-- ==============================================================================
-- DISKAI - ESQUEMA DE BANCO DE DADOS SUPABASE (BLINDADO E IDEMPOTENTE)
-- Sistema de Gatekeeping, Mensagens, Conversas Relacionais, Reuniões e Storage Privado
-- ==============================================================================

-- 1. Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Tabela de Perfis de Usuários (public.profiles)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text not null,
  tag text not null default '0001',
  avatar text default 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  role text default 'user',
  status text default 'pending',
  is_approved boolean default false not null,
  presence_status text default 'online',
  custom_status text,
  banner_color text default '#5865F2',
  pronouns text default 'ele/dele',
  bio text default 'Membro do Diskai',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Migração segura de colunas caso a tabela já exista
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_presence_status_check;

alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists is_approved boolean default false;
alter table public.profiles add column if not exists presence_status text default 'online';
alter table public.profiles add column if not exists banner_color text default '#5865F2';
alter table public.profiles add column if not exists pronouns text default 'ele/dele';
alter table public.profiles add column if not exists bio text default 'Membro do Diskai';

-- Padronizar administrador principal
update public.profiles
set
  role = 'admin',
  status = 'approved',
  is_approved = true
where lower(trim(coalesce(email, ''))) in ('campanholo32@gmail.com', 'campanholo32gmail.com')
   or role in ('admin', 'Administrador');

update public.profiles
set role = 'user'
where role is null or role not in ('admin', 'user');

update public.profiles
set status = case
  when is_approved = true or role = 'admin' then 'approved'
  when status in ('approved', 'rejected') then status
  else 'pending'
end;

update public.profiles
set is_approved = (status = 'approved');

update public.profiles
set presence_status = 'online'
where presence_status is null or presence_status not in ('online', 'idle', 'dnd', 'offline');

alter table public.profiles alter column role set default 'user';
alter table public.profiles alter column is_approved set default false;
alter table public.profiles alter column is_approved set not null;
alter table public.profiles alter column status set default 'pending';

alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'user'));
alter table public.profiles add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));
alter table public.profiles add constraint profiles_presence_status_check check (presence_status in ('online', 'idle', 'dnd', 'offline'));

-- 3. Funções de Suporte ao Gatekeeping (Security Definer sem recursão infinita)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select (role = 'admin' and is_approved = true)
     from public.profiles
     where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select (is_approved = true and status = 'approved')
     from public.profiles
     where id = auth.uid()),
    false
  );
$$;

-- 4. Gatilho contra Escalação de Privilégios
create or replace function public.check_profile_privilege_escalation()
returns trigger as $$
begin
  if not public.is_admin() then
    if (new.role is distinct from old.role) or 
       (new.status is distinct from old.status) or 
       (new.is_approved is distinct from old.is_approved) then
      raise exception 'Permissão negada: apenas o Administrador da plataforma DiskAI pode autorizar contas ou alterar cargos.';
    end if;
  end if;
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists tr_prevent_profile_escalation on public.profiles;
create trigger tr_prevent_profile_escalation
  before update on public.profiles
  for each row
  execute procedure public.check_profile_privilege_escalation();

-- 5. Trigger handle_new_user() atualizada para Gatekeeping estrito
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_platform_admin boolean;
  clean_email text;
begin
  clean_email := lower(trim(coalesce(new.email, '')));
  is_platform_admin := (clean_email in ('campanholo32@gmail.com', 'campanholo32gmail.com'));

  insert into public.profiles (
    id,
    email,
    name,
    tag,
    avatar,
    role,
    status,
    is_approved,
    presence_status,
    custom_status
  )
  values (
    new.id,
    clean_email,
    coalesce(new.raw_user_meta_data->>'name', split_part(clean_email, '@', 1)),
    lpad((floor(random() * 9000) + 1000)::text, 4, '0'),
    coalesce(new.raw_user_meta_data->>'avatar', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'),
    case when is_platform_admin then 'admin' else 'user' end,
    case when is_platform_admin then 'approved' else 'pending' end,
    case when is_platform_admin then true else false end,
    'online',
    case when is_platform_admin then '👑 Administrador da Plataforma DiskAI' else 'Aguardando aprovação do Administrador' end
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case when is_platform_admin then 'admin' else public.profiles.role end,
    status = case when is_platform_admin then 'approved' else public.profiles.status end,
    is_approved = case when is_platform_admin then true else public.profiles.is_approved end;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Tabela de Servidores
create table if not exists public.servers (
  id text primary key,
  name text not null,
  acronym text not null,
  icon text,
  owner_id uuid references auth.users(id),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 7. Tabela de Canais (Texto e Voz/Reunião)
create table if not exists public.channels (
  id text primary key,
  server_id text references public.servers(id) on delete cascade,
  name text not null,
  type text check (type in ('text', 'voice', 'forum')) default 'text',
  topic text,
  is_meeting_hub boolean default false,
  is_private boolean default false,
  allowed_members jsonb default '[]'::jsonb,
  slow_mode integer default 0,
  is_spoiler boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.channels add column if not exists is_private boolean default false;
alter table public.channels add column if not exists allowed_members jsonb default '[]'::jsonb;
alter table public.channels add column if not exists slow_mode integer default 0;
alter table public.channels add column if not exists is_spoiler boolean default false;

-- 8. Tabelas Relacionais: Conversations e Conversation Participants
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group', 'channel')),
  name text,
  server_id text references public.servers(id) on delete cascade,
  channel_id text references public.channels(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_conversations_type on public.conversations(type);
create index if not exists idx_conversations_server on public.conversations(server_id);
create index if not exists idx_conversations_channel on public.conversations(channel_id);

create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' check (role in ('admin', 'moderator', 'member')),
  joined_at timestamptz default timezone('utc'::text, now()) not null,
  last_read_at timestamptz default timezone('utc'::text, now()),
  primary key (conversation_id, user_id)
);

create index if not exists idx_conv_part_user on public.conversation_participants(user_id);
create index if not exists idx_conv_part_conv on public.conversation_participants(conversation_id);

-- 9. Tabela de Mensagens
create table if not exists public.messages (
  id text primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  channel_id text,
  user_id uuid references auth.users(id) on delete set null,
  sender_id uuid references auth.users(id) on delete set null,
  user_name text not null,
  user_avatar text,
  content text default '',
  attachments jsonb default '[]'::jsonb,
  reactions jsonb default '[]'::jsonb,
  embed jsonb,
  is_pinned boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists sender_id uuid references auth.users(id) on delete set null;
create index if not exists idx_messages_conv on public.messages(conversation_id);
create index if not exists idx_messages_channel on public.messages(channel_id);

-- 10. Tabela de Mensagens Diretas (DMs legadas)
create table if not exists public.direct_messages (
  id text primary key,
  sender_id uuid references auth.users(id),
  recipient_id uuid references auth.users(id),
  content text default '',
  attachments jsonb default '[]'::jsonb,
  reactions jsonb default '[]'::jsonb,
  embed jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 11. Tabela de Atas e Resumos de Reuniões com IA
create table if not exists public.meeting_summaries (
  id text primary key,
  title text not null,
  channel_name text not null,
  server_name text not null,
  date text not null,
  duration_formatted text not null,
  duration_seconds integer default 0,
  participants jsonb default '[]'::jsonb,
  executive_summary text not null,
  sentiment text default 'Produtivo & Focado',
  key_topics jsonb default '[]'::jsonb,
  action_items jsonb default '[]'::jsonb,
  decisions jsonb default '[]'::jsonb,
  transcript jsonb default '[]'::jsonb,
  audio_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ==============================================================================

-- 12. RLS em Profiles
alter table public.profiles enable row level security;

drop policy if exists "Perfis visíveis para todos os usuários autenticados" on public.profiles;
drop policy if exists "Usuários podem atualizar seus próprios perfis" on public.profiles;
drop policy if exists "Usuários podem inserir seu próprio perfil" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_insert_policy" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "profiles_delete_policy" on public.profiles;

create policy "profiles_select_policy"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_admin()
    or (public.is_approved() and is_approved = true)
  );

create policy "profiles_insert_policy"
  on public.profiles for insert
  with check (auth.uid() = id or public.is_admin());

create policy "profiles_update_policy"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

create policy "profiles_delete_policy"
  on public.profiles for delete
  using (public.is_admin());

-- 13. RLS em Conversations
alter table public.conversations enable row level security;

drop policy if exists "conversations_select_policy" on public.conversations;
drop policy if exists "conversations_insert_policy" on public.conversations;
drop policy if exists "conversations_update_policy" on public.conversations;
drop policy if exists "conversations_delete_policy" on public.conversations;

create policy "conversations_select_policy"
  on public.conversations for select
  using (
    public.is_admin()
    or (
      public.is_approved()
      and exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = id
          and cp.user_id = auth.uid()
      )
    )
  );

create policy "conversations_insert_policy"
  on public.conversations for insert
  with check (
    public.is_admin()
    or (public.is_approved() and (created_by = auth.uid() or created_by is null))
  );

create policy "conversations_update_policy"
  on public.conversations for update
  using (
    public.is_admin()
    or (public.is_approved() and created_by = auth.uid())
  );

create policy "conversations_delete_policy"
  on public.conversations for delete
  using (
    public.is_admin()
    or (public.is_approved() and created_by = auth.uid())
  );

-- 14. RLS em Conversation Participants
alter table public.conversation_participants enable row level security;

drop policy if exists "conv_part_select_policy" on public.conversation_participants;
drop policy if exists "conv_part_insert_policy" on public.conversation_participants;
drop policy if exists "conv_part_delete_policy" on public.conversation_participants;

create policy "conv_part_select_policy"
  on public.conversation_participants for select
  using (
    public.is_admin()
    or (
      public.is_approved()
      and exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = conversation_participants.conversation_id
          and cp.user_id = auth.uid()
      )
    )
  );

create policy "conv_part_insert_policy"
  on public.conversation_participants for insert
  with check (
    public.is_admin()
    or (
      public.is_approved()
      and (
        user_id = auth.uid()
        or exists (
          select 1 from public.conversations c
          where c.id = conversation_id
            and (c.created_by = auth.uid() or c.type = 'channel')
        )
      )
    )
  );

create policy "conv_part_delete_policy"
  on public.conversation_participants for delete
  using (
    public.is_admin()
    or (
      public.is_approved()
      and (
        user_id = auth.uid()
        or exists (
          select 1 from public.conversations c
          where c.id = conversation_id
            and c.created_by = auth.uid()
        )
      )
    )
  );

-- 15. RLS em Messages
alter table public.messages enable row level security;

drop policy if exists "Mensagens visíveis para todos" on public.messages;
drop policy if exists "Usuários autenticados podem enviar mensagens" on public.messages;
drop policy if exists "Usuários podem editar reações de mensagens" on public.messages;
drop policy if exists "messages_select_policy" on public.messages;
drop policy if exists "messages_insert_policy" on public.messages;
drop policy if exists "messages_update_policy" on public.messages;
drop policy if exists "messages_delete_policy" on public.messages;

create policy "messages_select_policy"
  on public.messages for select
  using (
    public.is_admin()
    or (
      public.is_approved()
      and (
        (conversation_id is not null and exists (
          select 1 from public.conversation_participants cp
          where cp.conversation_id = messages.conversation_id
            and cp.user_id = auth.uid()
        ))
        or (conversation_id is null)
      )
    )
  );

create policy "messages_insert_policy"
  on public.messages for insert
  with check (
    public.is_admin()
    or (
      public.is_approved()
      and (auth.uid() = user_id or auth.uid() = sender_id or user_id is null)
      and (
        conversation_id is null
        or exists (
          select 1 from public.conversation_participants cp
          where cp.conversation_id = messages.conversation_id
            and cp.user_id = auth.uid()
        )
      )
    )
  );

create policy "messages_update_policy"
  on public.messages for update
  using (
    public.is_admin()
    or (
      public.is_approved()
      and (auth.uid() = user_id or auth.uid() = sender_id or true)
    )
  );

create policy "messages_delete_policy"
  on public.messages for delete
  using (
    public.is_admin()
    or (public.is_approved() and (auth.uid() = user_id or auth.uid() = sender_id))
  );

-- 16. RLS em Direct Messages
alter table public.direct_messages enable row level security;

drop policy if exists "DMs visíveis para participantes" on public.direct_messages;
drop policy if exists "Participantes podem enviar DMs" on public.direct_messages;
drop policy if exists "dm_select_policy" on public.direct_messages;
drop policy if exists "dm_insert_policy" on public.direct_messages;

create policy "dm_select_policy"
  on public.direct_messages for select
  using (
    public.is_admin()
    or (public.is_approved() and (auth.uid() = sender_id or auth.uid() = recipient_id))
  );

create policy "dm_insert_policy"
  on public.direct_messages for insert
  with check (
    public.is_admin()
    or (public.is_approved() and auth.uid() = sender_id)
  );

-- 17. RLS em Servers & Channels
alter table public.servers enable row level security;
drop policy if exists "Servidores visíveis publicamente" on public.servers;
drop policy if exists "Usuários autenticados podem criar servidores" on public.servers;
drop policy if exists "servers_select_policy" on public.servers;
drop policy if exists "servers_insert_policy" on public.servers;
drop policy if exists "servers_update_policy" on public.servers;
drop policy if exists "servers_delete_policy" on public.servers;

create policy "servers_select_policy"
  on public.servers for select
  using (public.is_admin() or public.is_approved());

create policy "servers_insert_policy"
  on public.servers for insert
  with check (public.is_admin() or (public.is_approved() and auth.uid() = owner_id));

create policy "servers_update_policy"
  on public.servers for update
  using (public.is_admin() or (public.is_approved() and auth.uid() = owner_id));

create policy "servers_delete_policy"
  on public.servers for delete
  using (public.is_admin() or (public.is_approved() and auth.uid() = owner_id));

alter table public.channels enable row level security;
drop policy if exists "Canais visíveis para todos" on public.channels;
drop policy if exists "channels_select_policy" on public.channels;
drop policy if exists "channels_all_policy" on public.channels;
drop policy if exists "channels_insert_policy" on public.channels;
drop policy if exists "channels_update_policy" on public.channels;
drop policy if exists "channels_delete_policy" on public.channels;

create policy "channels_select_policy"
  on public.channels for select
  using (
    public.is_admin()
    or (
      public.is_approved()
      and (
        is_private is not true
        or auth.uid()::text = any(select jsonb_array_elements_text(coalesce(allowed_members, '[]'::jsonb)))
        or exists (
          select 1 from public.servers s
          where s.id = channels.server_id and s.owner_id = auth.uid()
        )
      )
    )
  );

create policy "channels_insert_policy"
  on public.channels for insert
  with check (
    public.is_admin()
    or (
      public.is_approved()
      and exists (
        select 1 from public.servers s
        where s.id = server_id and s.owner_id = auth.uid()
      )
    )
  );

create policy "channels_update_policy"
  on public.channels for update
  using (
    public.is_admin()
    or (
      public.is_approved()
      and exists (
        select 1 from public.servers s
        where s.id = channels.server_id and s.owner_id = auth.uid()
      )
    )
  );

create policy "channels_delete_policy"
  on public.channels for delete
  using (
    public.is_admin()
    or (
      public.is_approved()
      and exists (
        select 1 from public.servers s
        where s.id = channels.server_id and s.owner_id = auth.uid()
      )
    )
  );

-- 18. RLS em Meeting Summaries
alter table public.meeting_summaries enable row level security;
drop policy if exists "Resumos visíveis para todos os membros" on public.meeting_summaries;
drop policy if exists "Usuários podem salvar resumos de reunião" on public.meeting_summaries;
drop policy if exists "Usuários podem marcar itens de ação" on public.meeting_summaries;

create policy "summaries_select_policy"
  on public.meeting_summaries for select
  using (public.is_admin() or public.is_approved());

create policy "summaries_insert_policy"
  on public.meeting_summaries for insert
  with check (public.is_admin() or public.is_approved());

create policy "summaries_update_policy"
  on public.meeting_summaries for update
  using (public.is_admin() or public.is_approved());

-- 19. Storage Privado para Mídias (chat-media) e Políticas RLS em storage.objects
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "Chat-media leitura por participantes aprovados" on storage.objects;
drop policy if exists "Chat-media envio por participantes aprovados" on storage.objects;
drop policy if exists "Chat-media exclusão pelo autor ou admin" on storage.objects;

create policy "Chat-media leitura por participantes aprovados"
  on storage.objects for select
  using (
    bucket_id = 'chat-media'
    and (
      public.is_admin()
      or (
        public.is_approved()
        and (
          owner = auth.uid()
          or exists (
            select 1 from public.conversation_participants cp
            where cp.conversation_id::text = (storage.foldername(name))[1]
              and cp.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Chat-media envio por participantes aprovados"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and (
      public.is_admin()
      or (
        public.is_approved()
        and (
          owner = auth.uid()
          or exists (
            select 1 from public.conversation_participants cp
            where cp.conversation_id::text = (storage.foldername(name))[1]
              and cp.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Chat-media exclusão pelo autor ou admin"
  on storage.objects for delete
  using (
    bucket_id = 'chat-media'
    and (public.is_admin() or (public.is_approved() and owner = auth.uid()))
  );

-- ==============================================================================
-- 20. Appointments (Calendário & Tarefas da Arara Assistente)
-- ==============================================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  channel_id text,
  server_id text,
  attendees text[] default '{}',
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments enable row level security;
drop policy if exists "appointments_select_policy" on public.appointments;
drop policy if exists "appointments_insert_policy" on public.appointments;
drop policy if exists "appointments_update_policy" on public.appointments;
drop policy if exists "appointments_delete_policy" on public.appointments;

create policy "appointments_select_policy"
  on public.appointments for select
  to authenticated
  using (public.is_admin() or public.is_approved());

create policy "appointments_insert_policy"
  on public.appointments for insert
  to authenticated
  with check (public.is_admin() or (public.is_approved() and (user_id = auth.uid() or user_id is null)));

create policy "appointments_update_policy"
  on public.appointments for update
  to authenticated
  using (public.is_admin() or (public.is_approved() and (user_id = auth.uid() or user_id is null)));

create policy "appointments_delete_policy"
  on public.appointments for delete
  to authenticated
  using (public.is_admin() or (public.is_approved() and (user_id = auth.uid() or user_id is null)));

-- ==============================================================================
-- 21. Pinned Messages (Mensagens Fixadas)
-- ==============================================================================
create table if not exists public.pinned_messages (
  id text primary key,
  channel_id text not null,
  message_id text,
  author_name text not null,
  author_avatar text,
  content text not null,
  timestamp text,
  pinned_by text,
  created_at timestamptz not null default now()
);

alter table public.pinned_messages enable row level security;
drop policy if exists "pinned_messages_select_policy" on public.pinned_messages;
drop policy if exists "pinned_messages_insert_policy" on public.pinned_messages;
drop policy if exists "pinned_messages_update_policy" on public.pinned_messages;
drop policy if exists "pinned_messages_delete_policy" on public.pinned_messages;

create policy "pinned_messages_select_policy"
  on public.pinned_messages for select
  to authenticated
  using (public.is_admin() or public.is_approved());

create policy "pinned_messages_insert_policy"
  on public.pinned_messages for insert
  to authenticated
  with check (public.is_admin() or public.is_approved());

create policy "pinned_messages_update_policy"
  on public.pinned_messages for update
  to authenticated
  using (public.is_admin() or public.is_approved());

create policy "pinned_messages_delete_policy"
  on public.pinned_messages for delete
  to authenticated
  using (public.is_admin() or (public.is_approved() and (pinned_by = auth.uid()::text or pinned_by is null)));

-- ==============================================================================
-- 22. Calls & Call Summaries
-- ==============================================================================
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null,
  receiver_id uuid not null,
  status varchar(20) not null default 'ringing' check (status in ('ringing', 'accepted', 'rejected', 'ended')),
  room_name varchar(100),
  with_video boolean not null default false,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.calls enable row level security;
drop policy if exists "calls_select_policy" on public.calls;
drop policy if exists "calls_insert_policy" on public.calls;
drop policy if exists "calls_update_policy" on public.calls;

create policy "calls_select_policy"
  on public.calls for select
  to authenticated
  using (caller_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());

create policy "calls_insert_policy"
  on public.calls for insert
  to authenticated
  with check (caller_id = auth.uid());

create policy "calls_update_policy"
  on public.calls for update
  to authenticated
  using (caller_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());

create table if not exists public.call_summaries (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references public.calls(id) on delete set null,
  channel_id text,
  conversation_id uuid references public.conversations(id) on delete set null,
  title text not null,
  executive_summary text not null,
  key_topics jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  sentiment text default 'Produtivo & Focado',
  audio_url text,
  participants jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.call_summaries enable row level security;
drop policy if exists "call_summaries_select_policy" on public.call_summaries;
drop policy if exists "call_summaries_insert_policy" on public.call_summaries;
drop policy if exists "call_summaries_update_policy" on public.call_summaries;

create policy "call_summaries_select_policy"
  on public.call_summaries for select
  to authenticated
  using (public.is_admin() or public.is_approved());

create policy "call_summaries_insert_policy"
  on public.call_summaries for insert
  to authenticated
  with check (public.is_admin() or public.is_approved() or auth.uid() = created_by);

create policy "call_summaries_update_policy"
  on public.call_summaries for update
  to authenticated
  using (public.is_admin() or auth.uid() = created_by);

