-- =====================================================================
-- Migration 0010 — Módulo de Aluguéis (imóveis, contratos, cobranças)
--   Gestão de aluguéis com receitas recorrentes mensais. Um imóvel pode
--   ter vários contratos (unidades / locatários diferentes). Cada contrato
--   gera cobranças mensais (competência) com controle de recebido/pendente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Imóveis
-- ---------------------------------------------------------------------
create table if not exists public.imoveis (
  id_imovel     bigint generated always as identity primary key,
  nome          text not null,
  endereco      text,
  observacao    text,
  status        status_registro not null default 'ativo',
  data_cadastro timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Contratos de aluguel (imóvel + locatário pessoa física)
--   unidade: distingue contratos do mesmo imóvel (ex.: "Apto 12", "Loja 1")
-- ---------------------------------------------------------------------
create table if not exists public.contratos (
  id_contrato    bigint generated always as identity primary key,
  id_imovel      bigint not null references public.imoveis(id_imovel) on delete restrict,
  id_pessoa      bigint not null references public.pessoas_fisicas(id_pessoa) on delete restrict,
  unidade        text,
  valor_mensal   numeric(15,2) not null check (valor_mensal >= 0),
  dia_vencimento integer not null default 10 check (dia_vencimento between 1 and 31),
  data_inicio    date not null default current_date,
  data_fim       date,
  status         status_registro not null default 'ativo',
  observacao     text,
  data_cadastro  timestamptz not null default now()
);

create index if not exists idx_contratos_imovel on public.contratos (id_imovel);
create index if not exists idx_contratos_pessoa on public.contratos (id_pessoa);

-- ---------------------------------------------------------------------
-- Cobranças mensais (parcelas por competência)
--   competencia: 1º dia do mês de referência (ex.: 2026-08-01)
--   status: pendente | pago  (atrasado é derivado por vencimento < hoje)
-- ---------------------------------------------------------------------
create table if not exists public.cobrancas (
  id_cobranca     bigint generated always as identity primary key,
  id_contrato     bigint not null references public.contratos(id_contrato) on delete cascade,
  competencia     date not null,
  vencimento      date not null,
  valor           numeric(15,2) not null check (valor >= 0),
  status          text not null default 'pendente' check (status in ('pendente','pago')),
  data_pagamento  date,
  valor_pago      numeric(15,2),
  observacao      text,
  usuario         text,
  data_lancamento timestamptz not null default now(),
  unique (id_contrato, competencia)
);

create index if not exists idx_cobrancas_competencia on public.cobrancas (competencia);
create index if not exists idx_cobrancas_contrato on public.cobrancas (id_contrato);

-- ---------------------------------------------------------------------
-- RLS: leitura p/ autenticados; escrita p/ operador+admin; delete p/ admin
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['imoveis','contratos','cobrancas'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists sel_%1$s on public.%1$s;', t);
    execute format('drop policy if exists ins_%1$s on public.%1$s;', t);
    execute format('drop policy if exists upd_%1$s on public.%1$s;', t);
    execute format('drop policy if exists del_%1$s on public.%1$s;', t);
    execute format('create policy sel_%1$s on public.%1$s for select to authenticated using (true);', t);
    execute format('create policy ins_%1$s on public.%1$s for insert to authenticated with check (public.fn_pode_escrever());', t);
    execute format('create policy upd_%1$s on public.%1$s for update to authenticated using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());', t);
    execute format('create policy del_%1$s on public.%1$s for delete to authenticated using (public.fn_is_admin());', t);
  end loop;
end $$;

-- Cobranças podem ser removidas por operador+admin (fluxo "gerar + ajustar")
drop policy if exists del_cobrancas on public.cobrancas;
create policy del_cobrancas on public.cobrancas for delete to authenticated
  using (public.fn_pode_escrever());

-- Auditoria
do $$
declare t record;
begin
  for t in select * from (values
    ('imoveis','id_imovel'),('contratos','id_contrato'),('cobrancas','id_cobranca')
  ) as x(tab, pk) loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s;', t.tab);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.fn_auditoria(%2$L);', t.tab, t.pk);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- fn_gerar_cobrancas — gera as cobranças de uma competência (mês) para
--   todos os contratos ativos e vigentes que ainda não a possuem.
--   p_competencia: qualquer data do mês alvo (normalizada p/ o 1º dia).
--   Retorna a quantidade de cobranças criadas.
-- ---------------------------------------------------------------------
create or replace function public.fn_gerar_cobrancas(
  p_competencia date,
  p_usuario     text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes        date := date_trunc('month', p_competencia)::date;
  v_ult_dia    integer := extract(day from (v_mes + interval '1 month - 1 day'));
  v_criadas    integer := 0;
  c            record;
  v_venc       date;
begin
  if not public.fn_pode_escrever() then
    raise exception 'Seu perfil não tem permissão para gerar cobranças'
      using errcode = '42501';
  end if;

  for c in
    select * from public.contratos
    where status = 'ativo'
      and data_inicio <= (v_mes + interval '1 month - 1 day')::date
      and (data_fim is null or data_fim >= v_mes)
  loop
    -- dia de vencimento ajustado ao último dia do mês, quando necessário
    v_venc := make_date(
      extract(year from v_mes)::int,
      extract(month from v_mes)::int,
      least(c.dia_vencimento, v_ult_dia)
    );

    insert into public.cobrancas (id_contrato, competencia, vencimento, valor, usuario)
    values (c.id_contrato, v_mes, v_venc, c.valor_mensal, p_usuario)
    on conflict (id_contrato, competencia) do nothing;

    if found then v_criadas := v_criadas + 1; end if;
  end loop;

  return v_criadas;
end;
$$;

-- ---------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------
create or replace view public.vw_cobrancas as
select
  c.id_cobranca, c.id_contrato, c.competencia, c.vencimento, c.valor,
  c.status, c.data_pagamento, c.valor_pago, c.observacao,
  ct.id_imovel, im.nome as nome_imovel, ct.unidade,
  ct.id_pessoa, pf.nome as nome_locatario,
  case
    when c.status = 'pago' then 'pago'
    when c.vencimento < current_date then 'atrasado'
    else 'pendente'
  end as situacao
from public.cobrancas c
join public.contratos ct on ct.id_contrato = c.id_contrato
join public.imoveis im on im.id_imovel = ct.id_imovel
join public.pessoas_fisicas pf on pf.id_pessoa = ct.id_pessoa;

create or replace view public.vw_resumo_mensal as
select
  competencia,
  count(*)                                          as qtd,
  count(*) filter (where status = 'pago')           as qtd_pagas,
  coalesce(sum(valor), 0)                            as previsto,
  coalesce(sum(valor) filter (where status = 'pago'), 0)      as recebido,
  coalesce(sum(valor) filter (where status = 'pendente'), 0)  as pendente
from public.cobrancas
group by competencia;

create or replace view public.vw_contratos as
select
  ct.id_contrato, ct.id_imovel, im.nome as nome_imovel, ct.unidade,
  ct.id_pessoa, pf.nome as nome_locatario,
  ct.valor_mensal, ct.dia_vencimento, ct.data_inicio, ct.data_fim, ct.status
from public.contratos ct
join public.imoveis im on im.id_imovel = ct.id_imovel
join public.pessoas_fisicas pf on pf.id_pessoa = ct.id_pessoa;
