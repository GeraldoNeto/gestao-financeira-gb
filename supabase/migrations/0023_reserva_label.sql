-- Alinha o rótulo do crédito inicial ao histórico da especificação.
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
  values (v_id, 'CREDITO', 'Criação da reserva', p_valor, p_valor, p_usuario);

  return v_id;
end;
$$;
