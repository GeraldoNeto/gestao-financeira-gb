-- =====================================================================
-- Migration 0014 — Divisão prevista (automática do valor cadastrado)
--   Divide o valor mensal dos aluguéis (contratos ativos) entre os irmãos,
--   por percentual do imóvel — sem depender de pagamento. É a divisão que
--   cada irmão DEVE receber por mês.
-- =====================================================================

create or replace view public.vw_divisao_prevista as
select
  ct.id_imovel,
  im.nome as nome_imovel,
  ct.id_contrato,
  ct.unidade,
  ct.valor_mensal,
  epp.id_pessoa,
  pf.nome as nome_irmao,
  epp.percentual,
  round(
    ct.valor_mensal * epp.percentual
    / nullif(sum(epp.percentual) over (partition by ct.id_contrato), 0),
    2
  ) as valor_irmao
from public.contratos ct
join public.imoveis im on im.id_imovel = ct.id_imovel
join public.imovel_pessoa_percentual epp on epp.id_imovel = ct.id_imovel
join public.pessoas_fisicas pf on pf.id_pessoa = epp.id_pessoa
where ct.status = 'ativo';

alter view public.vw_divisao_prevista set (security_invoker = true);
