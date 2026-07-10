-- =====================================================================
-- Migration 0009 — Percentual por empresa × pessoa (Módulo 7, revisão)
--   O percentual de recebimento deixa de ser global da pessoa e passa a
--   depender da empresa: a mesma pessoa pode receber 50% de uma empresa e
--   100% de outra. Configurado na página da empresa. Sem registro = 100%.
-- =====================================================================

-- Remove o percentual global da pessoa (substituído pelo vínculo por empresa)
drop view if exists public.vw_saldo_pessoa;
alter table public.pessoas_fisicas drop column if exists percentual_recebimento;
create view public.vw_saldo_pessoa as
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

-- Vínculo empresa × pessoa com o percentual de recebimento (0 a 100).
-- Ausência de linha = 100%.
create table if not exists public.empresa_pessoa_percentual (
  id_empresa  bigint not null references public.empresas(id_empresa) on delete cascade,
  id_pessoa   bigint not null references public.pessoas_fisicas(id_pessoa) on delete cascade,
  percentual  numeric(5,2) not null default 100
              check (percentual >= 0 and percentual <= 100),
  primary key (id_empresa, id_pessoa)
);

alter table public.empresa_pessoa_percentual enable row level security;

drop policy if exists sel_epp on public.empresa_pessoa_percentual;
drop policy if exists ins_epp on public.empresa_pessoa_percentual;
drop policy if exists upd_epp on public.empresa_pessoa_percentual;
drop policy if exists del_epp on public.empresa_pessoa_percentual;
create policy sel_epp on public.empresa_pessoa_percentual for select to authenticated using (true);
create policy ins_epp on public.empresa_pessoa_percentual for insert to authenticated with check (public.fn_pode_escrever());
create policy upd_epp on public.empresa_pessoa_percentual for update to authenticated using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());
create policy del_epp on public.empresa_pessoa_percentual for delete to authenticated using (public.fn_pode_escrever());

-- ---------------------------------------------------------------------
-- fn_executar_rateio — percentual lido do vínculo empresa × pessoa
--   (default 100 quando não há registro para o par).
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

  -- peso total = soma dos percentuais/100 dos participantes NESTA empresa
  select coalesce(sum(coalesce(epp.percentual, 100)), 0) / 100.0
    into v_peso_total
    from unnest(p_pessoas) as u(id)
    left join public.empresa_pessoa_percentual epp
      on epp.id_empresa = p_id_empresa and epp.id_pessoa = u.id;

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
    select coalesce(
      (select percentual from public.empresa_pessoa_percentual
        where id_empresa = p_id_empresa and id_pessoa = v_id_pessoa),
      100
    ) into v_pct;

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
