-- =====================================================================
-- Migration 0006 — Guard de permissão no rateio (Módulo 12)
--   fn_executar_rateio é SECURITY DEFINER (bypassa RLS). Sem este guard,
--   um usuário de perfil 'consulta' poderia executá-la e criar créditos.
--   Recriamos a função exigindo permissão de escrita (admin/operador).
--   Chamada por service_role / SQL direto (sem auth.uid) também é bloqueada;
--   nesses casos, insira via tabelas diretamente.
-- =====================================================================

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
  v_n                integer := array_length(p_pessoas, 1);
  v_individual       numeric(15,2);
  v_residual         numeric(15,2);
  v_id_rateio        bigint;
  v_id_pessoa        bigint;
  v_id_credito       bigint;
  v_valor            numeric(15,2);
  i                  integer := 0;
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

  v_individual := trunc(p_valor_total / v_n, 2);
  v_residual   := p_valor_total - (v_individual * v_n);

  insert into public.rateios (
    id_empresa, id_credito_empresa, valor_total, num_pessoas,
    valor_individual, valor_residual, data, usuario
  )
  values (
    p_id_empresa, p_id_credito_empresa, p_valor_total, v_n,
    v_individual, v_residual, p_data, p_usuario
  )
  returning id_rateio into v_id_rateio;

  foreach v_id_pessoa in array p_pessoas loop
    i := i + 1;
    v_valor := v_individual + case when i = 1 then v_residual else 0 end;

    insert into public.creditos_pessoa (id_pessoa, data, historico, valor, origem_rateio, usuario)
    values (v_id_pessoa, p_data, p_historico, v_valor, v_id_rateio, p_usuario)
    returning id_credito into v_id_credito;

    insert into public.rateio_participantes (id_rateio, id_pessoa, id_credito_pessoa, valor, recebeu_residual)
    values (v_id_rateio, v_id_pessoa, v_id_credito, v_valor, (i = 1 and v_residual <> 0));
  end loop;

  return v_id_rateio;
end;
$$;
