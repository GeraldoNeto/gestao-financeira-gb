-- O saldo da empresa passa a incluir os movimentos das reservas:
-- crédito da reserva soma em Créditos, débito da reserva soma em Débitos.
-- Assim a tela de Empresas reflete o que foi reservado e usado.
create or replace view public.vw_saldo_empresa as
select
  e.id_empresa,
  e.nome_empresa,
  e.status,
  coalesce(c.total, 0) + coalesce(rc.total, 0) as total_creditos,
  coalesce(d.total, 0) + coalesce(rd.total, 0) as total_debitos,
  (coalesce(c.total, 0) + coalesce(rc.total, 0)) - (coalesce(d.total, 0) + coalesce(rd.total, 0)) as saldo
from public.empresas e
left join (
  select id_empresa, sum(valor) as total from public.creditos_empresa group by id_empresa
) c on c.id_empresa = e.id_empresa
left join (
  select id_empresa, sum(valor) as total from public.debitos_empresa group by id_empresa
) d on d.id_empresa = e.id_empresa
left join (
  select r.id_empresa, sum(m.valor) as total
  from public.reserva_movimentos m
  join public.reservas r on r.id_reserva = m.id_reserva
  where m.tipo = 'CREDITO'
  group by r.id_empresa
) rc on rc.id_empresa = e.id_empresa
left join (
  select r.id_empresa, sum(m.valor) as total
  from public.reserva_movimentos m
  join public.reservas r on r.id_reserva = m.id_reserva
  where m.tipo = 'DEBITO'
  group by r.id_empresa
) rd on rd.id_empresa = e.id_empresa;
