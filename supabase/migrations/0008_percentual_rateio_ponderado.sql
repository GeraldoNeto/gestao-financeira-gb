-- =====================================================================
-- Migration 0008 — Percentual de recebimento + rateio ponderado (Módulo 7)
--   Regra de negócio: cada pessoa física tem um percentual de recebimento
--   (padrão 100%). No rateio, cada participante vale uma "cota" proporcional
--   ao seu percentual (100% = 1 cota, 50% = meia cota) e o valor total é
--   sempre distribuído integralmente entre os participantes (ponderado).
-- =====================================================================

-- Percentual de recebimento por pessoa (0 a 100)
alter table public.pessoas_fisicas
  add column if not exists percentual_recebimento numeric(5,2) not null default 100
  check (percentual_recebimento >= 0 and percentual_recebimento <= 100);

-- Registro do percentual aplicado a cada participante do rateio
alter table public.rateio_participantes
  add column if not exists percentual numeric(5,2) not null default 100;

-- Expõe o percentual na view de saldo das pessoas (para listagem)
create or replace view public.vw_saldo_pessoa as
select
  p.id_pessoa,
  p.nome,
  p.status,
  coalesce(c.total_creditos, 0) as total_creditos,
  coalesce(d.total_debitos, 0)  as total_debitos,
  coalesce(c.total_creditos, 0) - coalesce(d.total_debitos, 0) as saldo,
  p.percentual_recebimento
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
-- fn_executar_rateio — versão ponderada
--   valor_individual (cabeçalho) passa a significar "valor por cota (100%)".
--   Cada pessoa recebe trunc(total * peso_i / peso_total, 2); o resíduo de
--   arredondamento é somado ao 1º participante (mantém total exato).
-- ---------------------------------------------------------------------
create or replace function public.fn_executar_rateio(
  p_id_empresa         bigint,
  p_valor_total        numeric,
  p_pessoas            bigint[],
  p_id_credito_empresa bigint default null,
  p_historico          text   default 'Rateio de crédito da empresa',
  p_usuario            text   default null,
  p_data               date   default current_date
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n                 integer := array_length(p_pessoas, 1);
  v_peso_total        numeric;
  v_valor_cota        numeric(15,2);
  v_residual          numeric(15,2);
  v_soma              numeric(15,2) := 0;
  v_id_rateio         bigint;
  v_id_pessoa         bigint;
  v_pct               numeric(5,2);
  v_valor             numeric(15,2);
  v_id_credito        bigint;
  v_id_part           bigint;
  v_primeiro_credito  bigint;
  v_primeiro_part     bigint;
  i                   integer := 0;
begin
  if not public.fn_pode_escrever() then
    raise exception 'Seu perfil não tem permissão para executar rateios'
      using errcode = '42501';
  end if;
  if v_n is null or v_n = 0 then
    raise exception 'Rateio exige ao menos uma pessoa participante';
  end if;
  if p_valor_total is null or p_valor_total <= 0 then
    raise exception 'Valor total do rateio deve ser positivo';
  end if;

  -- peso total = soma dos percentuais/100 dos participantes
  select coalesce(sum(pf.percentual_recebimento), 0) / 100.0
    into v_peso_total
    from unnest(p_pessoas) as u(id)
    join public.pessoas_fisicas pf on pf.id_pessoa = u.id;

  if v_peso_total is null or v_peso_total <= 0 then
    raise exception 'A soma dos percentuais de recebimento dos participantes é zero';
  end if;

  v_valor_cota := trunc(p_valor_total / v_peso_total, 2);

  insert into public.rateios (
    id_empresa, id_credito_empresa, valor_total, num_pessoas,
    valor_individual, valor_residual, data, usuario
  )
  values (
    p_id_empresa, p_id_credito_empresa, p_valor_total, v_n,
    v_valor_cota, 0, p_data, p_usuario
  )
  returning id_rateio into v_id_rateio;

  foreach v_id_pessoa in array p_pessoas loop
    i := i + 1;
    select percentual_recebimento into v_pct
      from public.pessoas_fisicas where id_pessoa = v_id_pessoa;
    v_pct := coalesce(v_pct, 100);

    v_valor := trunc(p_valor_total * (v_pct / 100.0) / v_peso_total, 2);
    v_soma := v_soma + v_valor;

    insert into public.creditos_pessoa (id_pessoa, data, historico, valor, origem_rateio, usuario)
    values (v_id_pessoa, p_data, p_historico, v_valor, v_id_rateio, p_usuario)
    returning id_credito into v_id_credito;

    insert into public.rateio_participantes (id_rateio, id_pessoa, id_credito_pessoa, valor, percentual, recebeu_residual)
    values (v_id_rateio, v_id_pessoa, v_id_credito, v_valor, v_pct, false)
    returning id_participante into v_id_part;

    if i = 1 then
      v_primeiro_credito := v_id_credito;
      v_primeiro_part := v_id_part;
    end if;
  end loop;

  -- resíduo de arredondamento vai ao 1º participante
  v_residual := p_valor_total - v_soma;
  if v_residual <> 0 then
    update public.creditos_pessoa
      set valor = valor + v_residual where id_credito = v_primeiro_credito;
    update public.rateio_participantes
      set valor = valor + v_residual, recebeu_residual = true
      where id_participante = v_primeiro_part;
  end if;

  update public.rateios set valor_residual = v_residual where id_rateio = v_id_rateio;

  return v_id_rateio;
end;
$$;
