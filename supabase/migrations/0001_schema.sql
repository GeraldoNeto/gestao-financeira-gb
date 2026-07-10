-- =====================================================================
-- Sistema de Controle de Créditos e Débitos
-- Migration 0001 — Schema base (tabelas, tipos, índices)
-- Módulos: 1 (Empresas), 2 (Pessoas), 3-6 (Créditos/Débitos),
--          7 (Rateio), 11 (Logs), 12 (Usuários/Perfis)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
do $$ begin
  create type status_registro as enum ('ativo', 'inativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type perfil_acesso as enum ('administrador', 'operador', 'consulta');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Módulo 12 — Perfis de usuário (vinculado ao Supabase Auth)
--   auth.users é gerenciado pelo Supabase; espelhamos perfil/permissões.
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text not null,
  email         text,
  perfil        perfil_acesso not null default 'consulta',
  status        status_registro not null default 'ativo',
  data_cadastro timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Módulo 1 — Empresas
-- ---------------------------------------------------------------------
create table if not exists public.empresas (
  id_empresa       bigint generated always as identity primary key,
  nome_empresa     text not null,
  cnpj             text,
  endereco         text,
  telefone         text,
  email            text,
  data_cadastro    timestamptz not null default now(),
  status           status_registro not null default 'ativo'
);

-- ---------------------------------------------------------------------
-- Módulo 2 — Pessoas Físicas
-- ---------------------------------------------------------------------
create table if not exists public.pessoas_fisicas (
  id_pessoa        bigint generated always as identity primary key,
  nome             text not null,
  cpf              text,
  telefone         text,
  email            text,
  data_cadastro    timestamptz not null default now(),
  status           status_registro not null default 'ativo'
);

-- ---------------------------------------------------------------------
-- Módulo 3 — Créditos das Empresas
-- ---------------------------------------------------------------------
create table if not exists public.creditos_empresa (
  id_credito       bigint generated always as identity primary key,
  id_empresa       bigint not null references public.empresas(id_empresa) on delete restrict,
  data_credito     date not null default current_date,
  historico        text,
  valor            numeric(15,2) not null check (valor >= 0),
  observacao       text,
  usuario          text,
  data_lancamento  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Módulo 4 — Débitos das Empresas
-- ---------------------------------------------------------------------
create table if not exists public.debitos_empresa (
  id_debito        bigint generated always as identity primary key,
  id_empresa       bigint not null references public.empresas(id_empresa) on delete restrict,
  data_debito      date not null default current_date,
  historico        text,
  valor            numeric(15,2) not null check (valor >= 0),
  observacao       text,
  usuario          text,
  data_lancamento  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Módulo 5 — Créditos das Pessoas Físicas
--   origem_rateio: preenchido quando o crédito nasce de um rateio (Módulo 7)
-- ---------------------------------------------------------------------
create table if not exists public.creditos_pessoa (
  id_credito       bigint generated always as identity primary key,
  id_pessoa        bigint not null references public.pessoas_fisicas(id_pessoa) on delete restrict,
  data             date not null default current_date,
  historico        text,
  valor            numeric(15,2) not null check (valor >= 0),
  origem_rateio    bigint,          -- FK definida em 0002 após criar rateios
  usuario          text,
  data_lancamento  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Módulo 6 — Débitos das Pessoas Físicas
-- ---------------------------------------------------------------------
create table if not exists public.debitos_pessoa (
  id_debito        bigint generated always as identity primary key,
  id_pessoa        bigint not null references public.pessoas_fisicas(id_pessoa) on delete restrict,
  data             date not null default current_date,
  historico        text,
  valor            numeric(15,2) not null check (valor >= 0),
  usuario          text,
  data_lancamento  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Módulo 7 — Rateio (cabeçalho + participantes)
--   Vincula um crédito de empresa aos créditos gerados p/ pessoas.
-- ---------------------------------------------------------------------
create table if not exists public.rateios (
  id_rateio          bigint generated always as identity primary key,
  id_empresa         bigint not null references public.empresas(id_empresa) on delete restrict,
  id_credito_empresa bigint references public.creditos_empresa(id_credito) on delete set null,
  valor_total        numeric(15,2) not null check (valor_total > 0),
  num_pessoas        integer not null check (num_pessoas > 0),
  valor_individual   numeric(15,2) not null,   -- valor base por pessoa (truncado a 2 casas)
  valor_residual     numeric(15,2) not null default 0,  -- diferença de arredondamento
  data               date not null default current_date,
  usuario            text,
  data_lancamento    timestamptz not null default now()
);

create table if not exists public.rateio_participantes (
  id_participante   bigint generated always as identity primary key,
  id_rateio         bigint not null references public.rateios(id_rateio) on delete cascade,
  id_pessoa         bigint not null references public.pessoas_fisicas(id_pessoa) on delete restrict,
  id_credito_pessoa bigint references public.creditos_pessoa(id_credito) on delete set null,
  valor             numeric(15,2) not null,  -- valor efetivamente creditado (inclui residual, se aplicável)
  recebeu_residual  boolean not null default false
);

-- ---------------------------------------------------------------------
-- Módulo 11 / Requisitos — Log de auditoria
-- ---------------------------------------------------------------------
create table if not exists public.logs_auditoria (
  id            bigint generated always as identity primary key,
  tabela        text not null,
  operacao      text not null,          -- INSERT | UPDATE | DELETE
  registro_id   text,
  usuario       text,
  dados_antigos jsonb,
  dados_novos   jsonb,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Índices para consultas de extrato/relatório por FK e período
-- ---------------------------------------------------------------------
create index if not exists idx_cred_emp_empresa on public.creditos_empresa (id_empresa, data_credito);
create index if not exists idx_deb_emp_empresa  on public.debitos_empresa  (id_empresa, data_debito);
create index if not exists idx_cred_pes_pessoa  on public.creditos_pessoa  (id_pessoa, data);
create index if not exists idx_deb_pes_pessoa   on public.debitos_pessoa   (id_pessoa, data);
create index if not exists idx_rateio_empresa   on public.rateios          (id_empresa, data);
create index if not exists idx_rateio_part      on public.rateio_participantes (id_rateio);
create index if not exists idx_cred_pes_origem  on public.creditos_pessoa  (origem_rateio);
create index if not exists idx_log_tabela       on public.logs_auditoria   (tabela, criado_em);
