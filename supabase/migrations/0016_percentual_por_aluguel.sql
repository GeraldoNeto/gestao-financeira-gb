-- Peso de recebimento por ALUGUEL (contrato), não mais por imóvel.
-- Copia os pesos atuais (cada contrato herda o peso do seu imóvel) e
-- redireciona as views de divisão para a nova tabela.

create table public.contrato_pessoa_percentual (
  id_contrato bigint not null references public.contratos (id_contrato) on delete cascade,
  id_pessoa bigint not null references public.pessoas_fisicas (id_pessoa) on delete cascade,
  percentual numeric(5, 2) not null check (percentual > 0 and percentual <= 100),
  primary key (id_contrato, id_pessoa)
);

alter table public.contrato_pessoa_percentual enable row level security;

create policy sel_cpp on public.contrato_pessoa_percentual
  for select using (public.fn_pode_ler());
create policy ins_cpp on public.contrato_pessoa_percentual
  for insert with check (public.fn_pode_escrever());
create policy upd_cpp on public.contrato_pessoa_percentual
  for update using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());
create policy del_cpp on public.contrato_pessoa_percentual
  for delete using (public.fn_pode_escrever());

grant select, insert, update, delete on public.contrato_pessoa_percentual to authenticated;
grant all on public.contrato_pessoa_percentual to service_role;

-- Migra os pesos: cada aluguel herda o peso que o irmão tinha no imóvel
insert into public.contrato_pessoa_percentual (id_contrato, id_pessoa, percentual)
select ct.id_contrato, ipp.id_pessoa, ipp.percentual
from public.contratos ct
join public.imovel_pessoa_percentual ipp on ipp.id_imovel = ct.id_imovel;

-- Views de divisão passam a usar o peso por aluguel (mesmas colunas)
create or replace view public.vw_divisao_prevista as
select
  ct.id_imovel,
  im.nome as nome_imovel,
  ct.id_contrato,
  ct.unidade,
  ct.valor_mensal,
  cpp.id_pessoa,
  pf.nome as nome_irmao,
  cpp.percentual,
  round(
    ct.valor_mensal * cpp.percentual
      / nullif(sum(cpp.percentual) over (partition by ct.id_contrato), 0),
    2
  ) as valor_irmao
from public.contratos ct
join public.imoveis im on im.id_imovel = ct.id_imovel
join public.contrato_pessoa_percentual cpp on cpp.id_contrato = ct.id_contrato
join public.pessoas_fisicas pf on pf.id_pessoa = cpp.id_pessoa
where ct.status = 'ativo';

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
  c.id_cobranca
from public.cobrancas c
join public.contratos ct on ct.id_contrato = c.id_contrato
join public.imoveis im on im.id_imovel = ct.id_imovel
join public.contrato_pessoa_percentual cpp on cpp.id_contrato = c.id_contrato
join public.pessoas_fisicas pf on pf.id_pessoa = cpp.id_pessoa
where c.status = 'pago';

alter view public.vw_divisao_prevista set (security_invoker = true);
alter view public.vw_divisao_alugueis set (security_invoker = true);

drop table public.imovel_pessoa_percentual;
