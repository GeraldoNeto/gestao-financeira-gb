-- Repasses/pagamentos feitos a um irmão (ex.: quitar um boleto dele em vez de
-- transferir o valor). Abatem só do saldo daquele irmão — NÃO reduzem o bolo
-- dividido entre todos.

create table public.pagamentos_irmao (
  id_pagamento bigint generated always as identity primary key,
  id_pessoa bigint not null references public.pessoas_fisicas (id_pessoa) on delete cascade,
  competencia date not null,
  descricao text not null,
  valor numeric(15, 2) not null check (valor > 0),
  usuario text,
  data_lancamento timestamptz not null default now()
);

create index idx_pagamentos_irmao_comp on public.pagamentos_irmao (competencia);
create index idx_pagamentos_irmao_pessoa on public.pagamentos_irmao (id_pessoa);

alter table public.pagamentos_irmao enable row level security;

create policy sel_pag on public.pagamentos_irmao
  for select using (public.fn_pode_ler());
create policy ins_pag on public.pagamentos_irmao
  for insert with check (public.fn_pode_escrever());
create policy upd_pag on public.pagamentos_irmao
  for update using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());
create policy del_pag on public.pagamentos_irmao
  for delete using (public.fn_pode_escrever());

grant select, insert, update, delete on public.pagamentos_irmao to authenticated;
grant all on public.pagamentos_irmao to service_role;

drop trigger if exists trg_audit_pagamentos_irmao on public.pagamentos_irmao;
create trigger trg_audit_pagamentos_irmao
  after insert or update or delete on public.pagamentos_irmao
  for each row execute function public.fn_auditoria('id_pagamento');
