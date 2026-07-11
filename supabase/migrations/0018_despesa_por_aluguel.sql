-- Despesa pode ser vinculada a um aluguel específico (contrato).
-- NULL = gasto geral do mês (rateado no total). Preenchido = descontado só
-- daquele aluguel antes de dividi-lo; o que exceder o recebido daquele
-- aluguel volta a ser gasto geral (opção A).

alter table public.despesas_mes
  add column id_contrato bigint references public.contratos (id_contrato) on delete set null;

-- Expõe o contrato na divisão dos aluguéis recebidos (para descontar por aluguel)
create or replace view public.vw_divisao_alugueis as
select
  c.competencia,
  ct.id_imovel,
  im.nome as nome_imovel,
  cpp.id_pessoa,
  pf.nome as nome_irmao,
  cpp.percentual,
  c.valor as valor_recebido,
  round(
    c.valor * cpp.percentual
      / nullif(sum(cpp.percentual) over (partition by c.id_cobranca), 0),
    2
  ) as valor_irmao,
  c.data_pagamento,
  c.id_cobranca,
  ct.id_contrato
from public.cobrancas c
join public.contratos ct on ct.id_contrato = c.id_contrato
join public.imoveis im on im.id_imovel = ct.id_imovel
join public.contrato_pessoa_percentual cpp on cpp.id_contrato = c.id_contrato
join public.pessoas_fisicas pf on pf.id_pessoa = cpp.id_pessoa
where c.status = 'pago';

alter view public.vw_divisao_alugueis set (security_invoker = true);
