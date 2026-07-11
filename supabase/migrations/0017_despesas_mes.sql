-- Gastos adicionais do mês (gerais), descontados do total recebido
-- antes da divisão entre os irmãos.

create table public.despesas_mes (
  id_despesa bigint generated always as identity primary key,
  competencia date not null,
  descricao text not null,
  valor numeric(15, 2) not null check (valor > 0),
  usuario text,
  data_lancamento timestamptz not null default now()
);

create index idx_despesas_mes_competencia on public.despesas_mes (competencia);

alter table public.despesas_mes enable row level security;

create policy sel_despesas on public.despesas_mes
  for select using (public.fn_pode_ler());
create policy ins_despesas on public.despesas_mes
  for insert with check (public.fn_pode_escrever());
create policy upd_despesas on public.despesas_mes
  for update using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());
create policy del_despesas on public.despesas_mes
  for delete using (public.fn_pode_escrever());

grant select, insert, update, delete on public.despesas_mes to authenticated;
grant all on public.despesas_mes to service_role;

-- Auditoria
drop trigger if exists trg_audit_despesas_mes on public.despesas_mes;
create trigger trg_audit_despesas_mes
  after insert or update or delete on public.despesas_mes
  for each row execute function public.fn_auditoria('id_despesa');
