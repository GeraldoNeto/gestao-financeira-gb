-- =====================================================================
-- Migration 0005 — Seed de demonstração (opcional)
--   Popula empresas, pessoas, lançamentos e executa um rateio de exemplo.
--   Rode apenas em ambiente de desenvolvimento.
-- =====================================================================

insert into public.empresas (nome_empresa, cnpj, email, status) values
  ('Alfa Comércio Ltda', '11.111.111/0001-11', 'contato@alfa.com', 'ativo'),
  ('Beta Serviços S/A',   '22.222.222/0001-22', 'financeiro@beta.com', 'ativo');

insert into public.pessoas_fisicas (nome, cpf, email, status) values
  ('João Silva',   '111.111.111-11', 'joao@email.com',  'ativo'),
  ('Maria Souza',  '222.222.222-22', 'maria@email.com', 'ativo'),
  ('Pedro Santos', '333.333.333-33', 'pedro@email.com', 'ativo');

-- Créditos e débitos de empresa
insert into public.creditos_empresa (id_empresa, historico, valor, usuario)
values (1, 'Aporte inicial', 10000.00, 'seed');
insert into public.debitos_empresa (id_empresa, historico, valor, usuario)
values (1, 'Taxa administrativa', 250.00, 'seed');

-- Rateio de exemplo: R$ 100,00 entre 3 pessoas (gera residual de R$ 0,01)
--   100 / 3 = 33,3333... -> individual 33,33 ; residual 0,01 (vai p/ João)
select public.fn_executar_rateio(
  p_id_empresa  => 1,
  p_valor_total => 100.00,
  p_pessoas     => array[1,2,3]::bigint[],
  p_historico   => 'Rateio de bonificação',
  p_usuario     => 'seed'
);

-- Um débito de pessoa para exercitar saldo
insert into public.debitos_pessoa (id_pessoa, historico, valor, usuario)
values (2, 'Ajuste', 10.00, 'seed');
