-- Reservas de valores por empresa: fundo com crédito inicial, débitos de uso e
-- histórico completo (saldo após cada movimentação). Saldo = créditos − débitos.

create table public.reservas (
  id_reserva bigint generated always as identity primary key,
  id_empresa bigint not null references public.empresas (id_empresa) on delete cascade,
  descricao text not null,
  valor_inicial numeric(15, 2) not null check (valor_inicial > 0),
  saldo numeric(15, 2) not null default 0,
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  usuario text,
  data_cadastro timestamptz not null default now()
);

create table public.reserva_movimentos (
  id_movimento bigint generated always as identity primary key,
  id_reserva bigint not null references public.reservas (id_reserva) on delete cascade,
  tipo text not null check (tipo in ('CREDITO', 'DEBITO')),
  descricao text not null,
  valor numeric(15, 2) not null check (valor > 0),
  saldo_apos numeric(15, 2) not null,
  usuario text,
  criado_em timestamptz not null default now()
);

create index idx_reservas_empresa on public.reservas (id_empresa);
create index idx_reserva_mov_reserva on public.reserva_movimentos (id_reserva);

alter table public.reservas enable row level security;
alter table public.reserva_movimentos enable row level security;

create policy sel_res on public.reservas for select using (public.fn_pode_ler());
create policy ins_res on public.reservas for insert with check (public.fn_pode_escrever());
create policy upd_res on public.reservas for update using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());
create policy del_res on public.reservas for delete using (public.fn_pode_escrever());

create policy sel_resm on public.reserva_movimentos for select using (public.fn_pode_ler());
create policy ins_resm on public.reserva_movimentos for insert with check (public.fn_pode_escrever());
create policy upd_resm on public.reserva_movimentos for update using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());
create policy del_resm on public.reserva_movimentos for delete using (public.fn_pode_escrever());

grant select, insert, update, delete on public.reservas to authenticated;
grant select, insert, update, delete on public.reserva_movimentos to authenticated;
grant all on public.reservas to service_role;
grant all on public.reserva_movimentos to service_role;

-- Cria a reserva já com o crédito inicial (movimento CREDITO).
create or replace function public.fn_criar_reserva(
  p_id_empresa bigint,
  p_descricao text,
  p_valor numeric,
  p_usuario text default null
) returns bigint
language plpgsql
as $$
declare
  v_id bigint;
begin
  if p_valor is null or p_valor <= 0 then
    raise exception 'O valor da reserva deve ser maior que zero.';
  end if;

  insert into public.reservas (id_empresa, descricao, valor_inicial, saldo, usuario)
  values (p_id_empresa, p_descricao, p_valor, p_valor, p_usuario)
  returning id_reserva into v_id;

  insert into public.reserva_movimentos (id_reserva, tipo, descricao, valor, saldo_apos, usuario)
  values (v_id, 'CREDITO', 'Crédito inicial da reserva', p_valor, p_valor, p_usuario);

  return v_id;
end;
$$;

-- Registra um crédito ou débito na reserva, atualizando o saldo.
-- Débito acima do saldo é bloqueado, salvo p_permitir_negativo = true.
create or replace function public.fn_reserva_movimento(
  p_id_reserva bigint,
  p_tipo text,
  p_descricao text,
  p_valor numeric,
  p_usuario text default null,
  p_permitir_negativo boolean default false
) returns numeric
language plpgsql
as $$
declare
  v_saldo numeric(15, 2);
  v_status text;
  v_novo numeric(15, 2);
begin
  if p_tipo not in ('CREDITO', 'DEBITO') then
    raise exception 'Tipo de movimentação inválido.';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'O valor deve ser maior que zero.';
  end if;

  select saldo, status into v_saldo, v_status
  from public.reservas where id_reserva = p_id_reserva for update;

  if not found then
    raise exception 'Reserva não encontrada.';
  end if;
  if v_status = 'encerrada' then
    raise exception 'A reserva está encerrada.';
  end if;

  v_novo := v_saldo + case when p_tipo = 'CREDITO' then p_valor else -p_valor end;

  if p_tipo = 'DEBITO' and v_novo < 0 and not p_permitir_negativo then
    raise exception 'Saldo insuficiente na reserva (disponível: %).', v_saldo;
  end if;

  insert into public.reserva_movimentos (id_reserva, tipo, descricao, valor, saldo_apos, usuario)
  values (p_id_reserva, p_tipo, p_descricao, p_valor, v_novo, p_usuario);

  update public.reservas set saldo = v_novo where id_reserva = p_id_reserva;
  return v_novo;
end;
$$;

grant execute on function public.fn_criar_reserva(bigint, text, numeric, text) to authenticated;
grant execute on function public.fn_reserva_movimento(bigint, text, text, numeric, text, boolean) to authenticated;

-- Auditoria
drop trigger if exists trg_audit_reservas on public.reservas;
create trigger trg_audit_reservas after insert or update or delete on public.reservas
  for each row execute function public.fn_auditoria('id_reserva');
drop trigger if exists trg_audit_reserva_mov on public.reserva_movimentos;
create trigger trg_audit_reserva_mov after insert or update or delete on public.reserva_movimentos
  for each row execute function public.fn_auditoria('id_movimento');
