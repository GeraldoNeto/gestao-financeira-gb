-- =====================================================================
-- Migration 0013 — Divisão do aluguel entre os irmãos (co-donos)
--   Os imóveis são dos irmãos. O aluguel recebido de cada imóvel é dividido
--   entre eles por porcentagem. O "locatário/inquilino" sai do contrato.
-- =====================================================================

-- Remove o locatário do contrato (as views dependem da coluna → dropar antes)
drop view if exists public.vw_cobrancas;
drop view if exists public.vw_contratos;
alter table public.contratos drop column if exists id_pessoa;

-- Contrato agora é imóvel-centrico
create view public.vw_contratos as
select
  ct.id_contrato, ct.id_imovel, im.nome as nome_imovel, ct.unidade,
  ct.valor_mensal, ct.dia_vencimento, ct.data_inicio, ct.data_fim, ct.status
from public.contratos ct
join public.imoveis im on im.id_imovel = ct.id_imovel;

create view public.vw_cobrancas as
select
  c.id_cobranca, c.id_contrato, c.competencia, c.vencimento, c.valor,
  c.status, c.data_pagamento, c.valor_pago, c.observacao,
  ct.id_imovel, im.nome as nome_imovel, ct.unidade,
  case
    when c.status = 'pago' then 'pago'
    when c.vencimento < current_date then 'atrasado'
    else 'pendente'
  end as situacao
from public.cobrancas c
join public.contratos ct on ct.id_contrato = c.id_contrato
join public.imoveis im on im.id_imovel = ct.id_imovel;

-- Percentual de cada irmão (pessoa física) por imóvel. Ausência = não recebe.
create table if not exists public.imovel_pessoa_percentual (
  id_imovel  bigint not null references public.imoveis(id_imovel) on delete cascade,
  id_pessoa  bigint not null references public.pessoas_fisicas(id_pessoa) on delete cascade,
  percentual numeric(5,2) not null default 0 check (percentual >= 0 and percentual <= 100),
  primary key (id_imovel, id_pessoa)
);

alter table public.imovel_pessoa_percentual enable row level security;
grant select, insert, update, delete on public.imovel_pessoa_percentual to authenticated;

drop policy if exists sel_ipp on public.imovel_pessoa_percentual;
drop policy if exists ins_ipp on public.imovel_pessoa_percentual;
drop policy if exists upd_ipp on public.imovel_pessoa_percentual;
drop policy if exists del_ipp on public.imovel_pessoa_percentual;
create policy sel_ipp on public.imovel_pessoa_percentual for select to authenticated using (public.fn_pode_ler());
create policy ins_ipp on public.imovel_pessoa_percentual for insert to authenticated with check (public.fn_pode_escrever());
create policy upd_ipp on public.imovel_pessoa_percentual for update to authenticated using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());
create policy del_ipp on public.imovel_pessoa_percentual for delete to authenticated using (public.fn_pode_escrever());

-- Divisão dos aluguéis RECEBIDOS entre os irmãos.
--   Para cada cobrança paga, distribui o valor proporcionalmente ao % de cada
--   irmão naquele imóvel.
create view public.vw_divisao_alugueis as
select
  c.competencia,
  ct.id_imovel,
  im.nome as nome_imovel,
  epp.id_pessoa,
  pf.nome as nome_irmao,
  epp.percentual,
  c.valor as valor_recebido,
  round(
    c.valor * epp.percentual
    / nullif(sum(epp.percentual) over (partition by c.id_cobranca), 0),
    2
  ) as valor_irmao,
  c.data_pagamento,
  c.id_cobranca
from public.cobrancas c
join public.contratos ct on ct.id_contrato = c.id_contrato
join public.imoveis im on im.id_imovel = ct.id_imovel
join public.imovel_pessoa_percentual epp on epp.id_imovel = ct.id_imovel
join public.pessoas_fisicas pf on pf.id_pessoa = epp.id_pessoa
where c.status = 'pago';

-- Views respeitam a RLS do usuário (recriadas → re-setar security_invoker)
alter view public.vw_contratos set (security_invoker = true);
alter view public.vw_cobrancas set (security_invoker = true);
alter view public.vw_divisao_alugueis set (security_invoker = true);
