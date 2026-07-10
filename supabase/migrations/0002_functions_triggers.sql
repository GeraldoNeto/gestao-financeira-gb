-- =====================================================================
-- Migration 0002 — Funções e Triggers
-- Módulos: 7 (Rateio automático), 11 (Automações / Auditoria)
-- =====================================================================

-- FK tardia: crédito de pessoa -> rateio de origem (evita dependência circular no 0001)
alter table public.creditos_pessoa
  drop constraint if exists fk_credito_pessoa_rateio;
alter table public.creditos_pessoa
  add constraint fk_credito_pessoa_rateio
  foreign key (origem_rateio) references public.rateios(id_rateio) on delete set null;

-- ---------------------------------------------------------------------
-- Auditoria genérica (Módulo 11) — registra INSERT/UPDATE/DELETE em jsonb
-- ---------------------------------------------------------------------
create or replace function public.fn_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario text;
  v_id      text;
begin
  -- usuário: preferimos coluna "usuario" do registro; senão, o auth uid
  begin
    v_usuario := coalesce(
      (case when tg_op = 'DELETE' then (to_jsonb(old)->>'usuario')
                                  else (to_jsonb(new)->>'usuario') end),
      auth.uid()::text
    );
  exception when others then
    v_usuario := null;
  end;

  v_id := coalesce(
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> (tg_argv[0]),
    null
  );

  insert into public.logs_auditoria (tabela, operacao, registro_id, usuario, dados_antigos, dados_novos)
  values (
    tg_table_name,
    tg_op,
    v_id,
    v_usuario,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE','INSERT') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

-- Anexa auditoria às tabelas transacionais e de cadastro
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('empresas','id_empresa'),
      ('pessoas_fisicas','id_pessoa'),
      ('creditos_empresa','id_credito'),
      ('debitos_empresa','id_debito'),
      ('creditos_pessoa','id_credito'),
      ('debitos_pessoa','id_debito'),
      ('rateios','id_rateio')
    ) as x(tab, pk)
  loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s;', t.tab);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.fn_auditoria(%2$L);',
      t.tab, t.pk
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Módulo 7 — Rateio automático
--   Recebe empresa, valor total, lista de pessoas participantes e (opcional)
--   o crédito de empresa de origem. Faz tudo numa transação:
--     1. valor_individual = trunc(total / n, 2 casas)
--     2. residual = total - (valor_individual * n)   -> vai p/ a 1ª pessoa
--     3. cria 1 credito_pessoa por participante
--     4. grava cabeçalho (rateios) + participantes com vínculo aos créditos
--   Retorna o id do rateio criado.
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
  v_n                integer := array_length(p_pessoas, 1);
  v_individual       numeric(15,2);
  v_residual         numeric(15,2);
  v_id_rateio        bigint;
  v_id_pessoa        bigint;
  v_id_credito       bigint;
  v_valor            numeric(15,2);
  i                  integer := 0;
begin
  if v_n is null or v_n = 0 then
    raise exception 'Rateio exige ao menos uma pessoa participante';
  end if;
  if p_valor_total is null or p_valor_total <= 0 then
    raise exception 'Valor total do rateio deve ser positivo';
  end if;

  -- trunca para 2 casas para não distribuir mais do que o total
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
    -- residual acumulado é entregue ao primeiro participante
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
