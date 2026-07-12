-- Despesas recorrentes de um aluguel (todo mês): condomínio, seguro parcelado,
-- taxa fixa etc. Valem em todos os meses a partir de data_inicio (até data_fim,
-- se houver) e são descontadas da divisão de cada mês, sem precisar relançar.
-- Despesas avulsas continuam em despesas_mes (um mês só).

create table public.despesas_recorrentes (
  id_recorrente bigint generated always as identity primary key,
  id_contrato bigint not null references public.contratos (id_contrato) on delete cascade,
  descricao text not null,
  valor numeric(15, 2) not null check (valor > 0),
  data_inicio date not null,
  data_fim date,
  usuario text,
  data_lancamento timestamptz not null default now(),
  constraint fim_apos_inicio check (data_fim is null or data_fim >= data_inicio)
);

create index idx_desp_recorr_contrato on public.despesas_recorrentes (id_contrato);

alter table public.despesas_recorrentes enable row level security;

create policy sel_recorr on public.despesas_recorrentes for select using (public.fn_pode_ler());
create policy ins_recorr on public.despesas_recorrentes for insert with check (public.fn_pode_escrever());
create policy upd_recorr on public.despesas_recorrentes for update using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());
create policy del_recorr on public.despesas_recorrentes for delete using (public.fn_pode_escrever());

grant select, insert, update, delete on public.despesas_recorrentes to authenticated;
grant all on public.despesas_recorrentes to service_role;

drop trigger if exists trg_audit_desp_recorr on public.despesas_recorrentes;
create trigger trg_audit_desp_recorr after insert or update or delete on public.despesas_recorrentes
  for each row execute function public.fn_auditoria('id_recorrente');
