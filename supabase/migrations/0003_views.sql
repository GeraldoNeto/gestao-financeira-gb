-- =====================================================================
-- Migration 0003 — Views (Saldos, Extratos, Relatórios, Dashboard)
-- Módulos: 8 (Saldos), 9 (Relatórios), 10 (Dashboard)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Módulo 8 — Saldo por Empresa  (Saldo = Créditos − Débitos)
-- ---------------------------------------------------------------------
create or replace view public.vw_saldo_empresa as
select
  e.id_empresa,
  e.nome_empresa,
  e.status,
  coalesce(c.total_creditos, 0) as total_creditos,
  coalesce(d.total_debitos, 0)  as total_debitos,
  coalesce(c.total_creditos, 0) - coalesce(d.total_debitos, 0) as saldo
from public.empresas e
left join (
  select id_empresa, sum(valor) total_creditos
  from public.creditos_empresa group by id_empresa
) c on c.id_empresa = e.id_empresa
left join (
  select id_empresa, sum(valor) total_debitos
  from public.debitos_empresa group by id_empresa
) d on d.id_empresa = e.id_empresa;

-- ---------------------------------------------------------------------
-- Módulo 8 — Saldo por Pessoa Física
-- ---------------------------------------------------------------------
create or replace view public.vw_saldo_pessoa as
select
  p.id_pessoa,
  p.nome,
  p.status,
  coalesce(c.total_creditos, 0) as total_creditos,
  coalesce(d.total_debitos, 0)  as total_debitos,
  coalesce(c.total_creditos, 0) - coalesce(d.total_debitos, 0) as saldo
from public.pessoas_fisicas p
left join (
  select id_pessoa, sum(valor) total_creditos
  from public.creditos_pessoa group by id_pessoa
) c on c.id_pessoa = p.id_pessoa
left join (
  select id_pessoa, sum(valor) total_debitos
  from public.debitos_pessoa group by id_pessoa
) d on d.id_pessoa = p.id_pessoa;

-- ---------------------------------------------------------------------
-- Módulo 9 — Extrato financeiro (movimentações unificadas, c/ sinal)
-- ---------------------------------------------------------------------
create or replace view public.vw_extrato_empresa as
select id_empresa, 'CREDITO' as tipo, data_credito as data, historico, valor, data_lancamento
from public.creditos_empresa
union all
select id_empresa, 'DEBITO' as tipo, data_debito as data, historico, -valor, data_lancamento
from public.debitos_empresa;

create or replace view public.vw_extrato_pessoa as
select id_pessoa, 'CREDITO' as tipo, data, historico, valor, data_lancamento
from public.creditos_pessoa
union all
select id_pessoa, 'DEBITO' as tipo, data, historico, -valor, data_lancamento
from public.debitos_pessoa;

-- ---------------------------------------------------------------------
-- Módulo 9 — Rateios realizados e diferenças de arredondamento
-- ---------------------------------------------------------------------
create or replace view public.vw_rateios as
select
  r.id_rateio, r.id_empresa, e.nome_empresa, r.valor_total, r.num_pessoas,
  r.valor_individual, r.valor_residual, r.data, r.usuario,
  (select count(*) from public.rateio_participantes p where p.id_rateio = r.id_rateio) as qtd_creditos_gerados
from public.rateios r
join public.empresas e on e.id_empresa = r.id_empresa;

create or replace view public.vw_diferencas_arredondamento as
select id_rateio, id_empresa, valor_total, num_pessoas, valor_individual, valor_residual, data
from public.rateios
where valor_residual <> 0;

-- ---------------------------------------------------------------------
-- Módulo 10 — Dashboard consolidado (linha única com indicadores)
-- ---------------------------------------------------------------------
create or replace view public.vw_dashboard as
select
  -- Empresas
  (select count(*) from public.empresas where status = 'ativo')            as empresas_ativas,
  (select count(*) from public.empresas)                                   as empresas_total,
  (select coalesce(sum(valor),0) from public.creditos_empresa)             as empresas_creditos,
  (select coalesce(sum(valor),0) from public.debitos_empresa)              as empresas_debitos,
  (select coalesce(sum(valor),0) from public.creditos_empresa)
    - (select coalesce(sum(valor),0) from public.debitos_empresa)          as empresas_saldo,
  -- Pessoas Físicas
  (select count(*) from public.pessoas_fisicas where status = 'ativo')     as pessoas_ativas,
  (select count(*) from public.pessoas_fisicas)                            as pessoas_total,
  (select coalesce(sum(valor),0) from public.creditos_pessoa)              as pessoas_creditos,
  (select coalesce(sum(valor),0) from public.debitos_pessoa)               as pessoas_debitos,
  (select coalesce(sum(valor),0) from public.creditos_pessoa)
    - (select coalesce(sum(valor),0) from public.debitos_pessoa)           as pessoas_saldo,
  -- Financeiro geral
  (select coalesce(sum(valor),0) from public.creditos_empresa)             as total_recebido,
  (select coalesce(sum(valor),0) from public.creditos_pessoa)              as total_distribuido,
  (select coalesce(sum(valor),0) from public.debitos_empresa)
    + (select coalesce(sum(valor),0) from public.debitos_pessoa)           as total_debitado,
  (select coalesce(sum(valor_residual),0) from public.rateios)             as diferenca_pendente;

-- Últimos lançamentos (Módulo 10) — 20 mais recentes de todas as origens
create or replace view public.vw_ultimos_lancamentos as
select * from (
  select 'CREDITO_EMPRESA' as origem, id_credito as id, id_empresa as entidade_id,
         historico, valor, data_lancamento from public.creditos_empresa
  union all
  select 'DEBITO_EMPRESA', id_debito, id_empresa, historico, -valor, data_lancamento
  from public.debitos_empresa
  union all
  select 'CREDITO_PESSOA', id_credito, id_pessoa, historico, valor, data_lancamento
  from public.creditos_pessoa
  union all
  select 'DEBITO_PESSOA', id_debito, id_pessoa, historico, -valor, data_lancamento
  from public.debitos_pessoa
) t
order by data_lancamento desc
limit 20;
