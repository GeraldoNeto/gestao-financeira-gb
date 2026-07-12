-- Conta corrente entre irmãos: compensações financeiras sem transferência direta.
-- Uma operação "De → Para": quem pagou/adiantou (origem) fica CREDOR; quem se
-- beneficiou (destino) fica DEVEDOR. Suporta moeda estrangeira + cotação; o
-- valor canônico é sempre em reais (valor_brl = valor_moeda × cotacao).
-- O saldo de cada irmão (a receber − a pagar) entra no "A transferir" do mês.

create table public.contas_irmaos (
  id_conta bigint generated always as identity primary key,
  competencia date not null,
  id_origem bigint not null references public.pessoas_fisicas (id_pessoa) on delete cascade,
  id_destino bigint not null references public.pessoas_fisicas (id_pessoa) on delete cascade,
  descricao text not null,
  moeda text not null default 'BRL',
  cotacao numeric(18, 6) not null default 1 check (cotacao > 0),
  valor_moeda numeric(15, 2) not null check (valor_moeda > 0),
  valor_brl numeric(15, 2) not null check (valor_brl > 0),
  usuario text,
  data_lancamento timestamptz not null default now(),
  constraint origem_diferente_destino check (id_origem <> id_destino)
);

create index idx_contas_irmaos_comp on public.contas_irmaos (competencia);

alter table public.contas_irmaos enable row level security;

create policy sel_conta on public.contas_irmaos
  for select using (public.fn_pode_ler());
create policy ins_conta on public.contas_irmaos
  for insert with check (public.fn_pode_escrever());
create policy upd_conta on public.contas_irmaos
  for update using (public.fn_pode_escrever()) with check (public.fn_pode_escrever());
create policy del_conta on public.contas_irmaos
  for delete using (public.fn_pode_escrever());

grant select, insert, update, delete on public.contas_irmaos to authenticated;
grant all on public.contas_irmaos to service_role;

drop trigger if exists trg_audit_contas_irmaos on public.contas_irmaos;
create trigger trg_audit_contas_irmaos
  after insert or update or delete on public.contas_irmaos
  for each row execute function public.fn_auditoria('id_conta');
