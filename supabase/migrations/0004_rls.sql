-- =====================================================================
-- Migration 0004 — Row Level Security & Perfis (Módulo 12)
--   administrador / operador  -> leitura + escrita
--   consulta                  -> somente leitura
-- =====================================================================

-- Helpers de perfil (lêem o perfil do usuário autenticado)
create or replace function public.fn_perfil_atual()
returns perfil_acesso
language sql stable security definer set search_path = public as $$
  select perfil from public.perfis where id = auth.uid();
$$;

create or replace function public.fn_pode_escrever()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.fn_perfil_atual() in ('administrador','operador'), false);
$$;

create or replace function public.fn_is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.fn_perfil_atual() = 'administrador', false);
$$;

-- Provisiona automaticamente um perfil quando um usuário se cadastra no Auth
create or replace function public.fn_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, email, perfil)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), new.email, 'consulta')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_auth_novo_usuario on auth.users;
create trigger trg_auth_novo_usuario
  after insert on auth.users
  for each row execute function public.fn_novo_usuario();

-- Habilita RLS em todas as tabelas de dados
do $$
declare t text;
begin
  foreach t in array array[
    'empresas','pessoas_fisicas','creditos_empresa','debitos_empresa',
    'creditos_pessoa','debitos_pessoa','rateios','rateio_participantes',
    'logs_auditoria','perfis'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Tabelas de negócio: SELECT p/ qualquer autenticado; escrita só p/ operador+admin
do $$
declare t text;
begin
  foreach t in array array[
    'empresas','pessoas_fisicas','creditos_empresa','debitos_empresa',
    'creditos_pessoa','debitos_pessoa','rateios','rateio_participantes'
  ] loop
    execute format('drop policy if exists sel_%1$s on public.%1$s;', t);
    execute format('drop policy if exists ins_%1$s on public.%1$s;', t);
    execute format('drop policy if exists upd_%1$s on public.%1$s;', t);
    execute format('drop policy if exists del_%1$s on public.%1$s;', t);

    execute format('create policy sel_%1$s on public.%1$s for select to authenticated using (true);', t);
    execute format('create policy ins_%1$s on public.%1$s for insert to authenticated with check (public.fn_pode_escrever());', t);
    execute format('create policy upd_%1$s on public.%1$s for update to authenticated using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());', t);
    -- Exclusão restrita a administrador (Módulo 12: permissão de Exclusão)
    execute format('create policy del_%1$s on public.%1$s for delete to authenticated using (public.fn_is_admin());', t);
  end loop;
end $$;

-- Logs: leitura p/ autenticados; sem escrita direta (só via trigger security definer)
drop policy if exists sel_logs on public.logs_auditoria;
create policy sel_logs on public.logs_auditoria for select to authenticated using (true);

-- Perfis: cada um vê o próprio; admin vê/edita todos
drop policy if exists sel_perfis on public.perfis;
drop policy if exists upd_perfis on public.perfis;
create policy sel_perfis on public.perfis for select to authenticated
  using (id = auth.uid() or public.fn_is_admin());
create policy upd_perfis on public.perfis for update to authenticated
  using (public.fn_is_admin()) with check (public.fn_is_admin());
