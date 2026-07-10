-- =====================================================================
-- Migration 0011 — Endurecimento da RLS de leitura (Módulo 12)
--   Leitura passa a exigir um perfil ATIVO. Desativar um usuário na tela de
--   Usuários remove o acesso de leitura imediatamente.
--   Também torna as views `security_invoker` para respeitarem a RLS do
--   usuário que consulta (por padrão, views no Postgres/Supabase rodam como
--   dono e IGNORAM a RLS das tabelas — o que expunha os dados via dashboard,
--   saldos, cobranças etc.).
-- =====================================================================

-- Retorna true se o usuário autenticado tem um perfil ATIVO.
create or replace function public.fn_pode_ler()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis where id = auth.uid() and status = 'ativo'
  );
$$;

-- Garante SELECT nas tabelas base ao papel authenticated (a RLS filtra as linhas)
grant select on all tables in schema public to authenticated;

-- Políticas de SELECT das tabelas de negócio -> exigem perfil ativo
do $$
declare t text;
begin
  foreach t in array array[
    'empresas','pessoas_fisicas','creditos_empresa','debitos_empresa',
    'creditos_pessoa','debitos_pessoa','rateios','rateio_participantes',
    'empresa_pessoa_percentual','imoveis','contratos','cobrancas','logs_auditoria'
  ] loop
    execute format('drop policy if exists sel_%1$s on public.%1$s;', t);
    execute format(
      'create policy sel_%1$s on public.%1$s for select to authenticated using (public.fn_pode_ler());',
      t
    );
  end loop;
end $$;

-- Corrige o nome da política de logs (mantém compatível)
drop policy if exists sel_logs on public.logs_auditoria;

-- Views respeitam a RLS de quem consulta
do $$
declare v text;
begin
  foreach v in array array[
    'vw_saldo_empresa','vw_saldo_pessoa','vw_extrato_empresa','vw_extrato_pessoa',
    'vw_rateios','vw_diferencas_arredondamento','vw_dashboard','vw_ultimos_lancamentos',
    'vw_contratos','vw_cobrancas','vw_resumo_mensal'
  ] loop
    execute format('alter view public.%I set (security_invoker = true);', v);
  end loop;
end $$;
