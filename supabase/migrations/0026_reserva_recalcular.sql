-- Recalcula o "saldo após" de cada movimento (na ordem) e o saldo da reserva.
-- Usado após editar ou excluir um lançamento do histórico.
create or replace function public.fn_reserva_recalcular(p_id_reserva bigint)
returns numeric
language plpgsql
as $$
declare
  v_saldo numeric(15, 2) := 0;
  r record;
begin
  for r in
    select id_movimento, tipo, valor
    from public.reserva_movimentos
    where id_reserva = p_id_reserva
    order by id_movimento
  loop
    v_saldo := v_saldo + case when r.tipo = 'CREDITO' then r.valor else -r.valor end;
    update public.reserva_movimentos set saldo_apos = v_saldo where id_movimento = r.id_movimento;
  end loop;

  update public.reservas set saldo = v_saldo where id_reserva = p_id_reserva;
  return v_saldo;
end;
$$;

grant execute on function public.fn_reserva_recalcular(bigint) to authenticated;
