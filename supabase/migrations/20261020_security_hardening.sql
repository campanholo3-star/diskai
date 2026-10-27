-- ==============================================================================
-- DISKAI - MIGRATION: SECURITY HARDENING, GATEKEEPING & STRICT RLS
-- Data: 2026-10-20
-- Descrição:
-- 1. Criação e padronização das colunas role ('admin'/'user'), status ('pending'/'approved'/'rejected')
--    e is_approved (boolean) na tabela public.profiles.
-- 2. Funções de suporte public.is_admin() e public.is_approved() com SECURITY DEFINER
--    garantindo imunidade total à recursão infinita no RLS.
-- 3. Gatilho contra escalação de privilégios (usuários não podem alterar role/status/is_approved).
-- 4. Atualização da trigger handle_new_user() para nascer 'pending' (exceto admin campanholo32@gmail.com).
-- 5. Estrutura relacional completa: conversations, conversation_participants e messages.
-- 6. Políticas de Row Level Security (RLS) estritas em TODAS as tabelas.
-- 7. Bucket de Storage privado chat-media com políticas de controle por participação na conversa.
-- ==============================================================================

-- 1. Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Atualização e Blindagem da tabela public.profiles
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

-- Migração segura de colunas existentes caso a tabela já tenha sido criada anteriormente
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_presence_status_check;

alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists is_approved boolean default false;
alter table public.profiles add column if not exists presence_status text default 'online';
alter table public.profiles add column if not exists banner_color text default '#5865F2';
alter table public.profiles add column if not exists pronouns text default 'ele/dele';
alter table public.profiles add column if not exists bio text default 'Membro do Diskai';

-- Padronizar administradores e aprovação imediata do administrador principal
update public.profiles
set
  role = 'admin',
  status = 'approved',
  is_approved = true
where lower(trim(coalesce(email, ''))) in ('campanholo32@gmail.com', 'campanholo32gmail.com')
   or role in ('admin', 'Administrador');

-- Ajustar demais registros para garantir coerência dos valores enum
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

-- Aplicar constraints de validação
alter table public.profiles alter column role set default 'user';
alter table public.profiles alter column is_approved set default false;
alter table public.profiles alter column is_approved set not null;
alter table public.profiles alter column status set default 'pending';

alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'user'));
alter table public.profiles add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));
alter table public.profiles add constraint profiles_presence_status_check check (presence_status in ('online', 'idle', 'dnd', 'offline'));

-- 3. Funções de Suporte ao Gatekeeping (Security Definer sem recursão)
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

-- 4. Gatilho contra Escalação de Privilégios (usuários comuns não podem alterar role/status/is_approved)
create or replace function public.check_profile_privilege_escalation()
returns trigger as $$
begin
  -- Se a ação for feita por um usuário comum (não admin), impedir modificação de permissões
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

-- 5.1 Atualização de canais
alter table public.channels drop constraint if exists channels_type_check;
alter table public.channels add constraint channels_type_check check (type in ('text', 'voice', 'forum'));
alter table public.channels add column if not exists is_private boolean default false;
alter table public.channels add column if not exists allowed_members jsonb default '[]'::jsonb;
alter table public.channels add column if not exists slow_mode integer default 0;
alter table public.channels add column if not exists is_spoiler boolean default false;

-- 6. Tabelas Relacionais: Conversations e Conversation Participants
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

-- Atualização na tabela messages para vincular conversations e sender_id
alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists sender_id uuid references auth.users(id) on delete set null;
create index if not exists idx_messages_conv on public.messages(conversation_id);
create index if not exists idx_messages_channel on public.messages(channel_id);

-- 7. Ativação e Blindagem de ROW LEVEL SECURITY (RLS)

-- Profiles
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
    -- O usuário sempre pode ver seu próprio perfil (para ver tela de aguardo de aprovação)
    auth.uid() = id
    -- Administrador pode ver todos os perfis
    or public.is_admin()
    -- Usuários aprovados podem ver outros perfis aprovados
    or (public.is_approved() and is_approved = true)
  );

create policy "profiles_insert_policy"
  on public.profiles for insert
  with check (
    auth.uid() = id or public.is_admin()
  );

create policy "profiles_update_policy"
  on public.profiles for update
  using (
    auth.uid() = id or public.is_admin()
  );

create policy "profiles_delete_policy"
  on public.profiles for delete
  using (
    public.is_admin()
  );

-- Conversations
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

-- Conversation Participants
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

-- Messages
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
        -- Se pertencer a uma conversa estruturada
        (conversation_id is not null and exists (
          select 1 from public.conversation_participants cp
          where cp.conversation_id = messages.conversation_id
            and cp.user_id = auth.uid()
        ))
        -- Se for mensagem legada ou de canal geral aberto aos membros aprovados
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
      and (auth.uid() = user_id or auth.uid() = sender_id or true /* permite reações por membros aprovados */)
    )
  );

create policy "messages_delete_policy"
  on public.messages for delete
  using (
    public.is_admin()
    or (public.is_approved() and (auth.uid() = user_id or auth.uid() = sender_id))
  );

-- Direct Messages (DMs legadas)
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

-- Servers & Channels
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

create policy "channels_select_policy"
  on public.channels for select
  using (public.is_admin() or public.is_approved());

create policy "channels_all_policy"
  on public.channels for all
  using (public.is_admin() or public.is_approved());

-- Meeting Summaries
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

-- 8. Storage Privado para Mídias (chat-media) e Políticas de Acesso
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do update set public = false;

-- Garantir que buckets públicos legados também exijam aprovação para upload
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do update set public = false;

-- Limpar políticas antigas em storage.objects
drop policy if exists "Chat-media leitura por participantes aprovados" on storage.objects;
drop policy if exists "Chat-media envio por participantes aprovados" on storage.objects;
drop policy if exists "Chat-media exclusão pelo autor ou admin" on storage.objects;

-- Leitura / Download seguro em chat-media
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

-- Upload seguro em chat-media
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

-- Exclusão em chat-media
create policy "Chat-media exclusão pelo autor ou admin"
  on storage.objects for delete
  using (
    bucket_id = 'chat-media'
    and (public.is_admin() or (public.is_approved() and owner = auth.uid()))
  );
