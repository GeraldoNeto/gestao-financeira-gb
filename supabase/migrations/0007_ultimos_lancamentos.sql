-- =====================================================================
-- Migration 0007 — vw_ultimos_lancamentos com nome da entidade (Módulo 10)
--   Recria a view incluindo entidade_nome e tipo_entidade, evitando
--   resolução de nomes na aplicação.
-- =====================================================================

drop view if exists public.vw_ultimos_lancamentos;
create view public.vw_ultimos_lancamentos as
select * from (
  select 'CREDITO' as tipo, 'empresa' as tipo_entidade,
         ce.id_credito as id, ce.id_empresa as entidade_id, e.nome_empresa as entidade_nome,
         ce.historico, ce.valor, ce.data_lancamento
  from public.creditos_empresa ce
  join public.empresas e on e.id_empresa = ce.id_empresa
  union all
  select 'DEBITO', 'empresa',
         de.id_debito, de.id_empresa, e.nome_empresa,
         de.historico, de.valor, de.data_lancamento
  from public.debitos_empresa de
  join public.empresas e on e.id_empresa = de.id_empresa
  union all
  select 'CREDITO', 'pessoa',
         cp.id_credito, cp.id_pessoa, p.nome,
         cp.historico, cp.valor, cp.data_lancamento
  from public.creditos_pessoa cp
  join public.pessoas_fisicas p on p.id_pessoa = cp.id_pessoa
  union all
  select 'DEBITO', 'pessoa',
         dp.id_debito, dp.id_pessoa, p.nome,
         dp.historico, dp.valor, dp.data_lancamento
  from public.debitos_pessoa dp
  join public.pessoas_fisicas p on p.id_pessoa = dp.id_pessoa
) t
order by data_lancamento desc
limit 20;
