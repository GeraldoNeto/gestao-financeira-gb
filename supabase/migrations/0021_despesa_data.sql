-- Data da despesa (IPTU, manutenção, seguro, IR…). A competência (mês do
-- rateio) é derivada do mês desta data. Nulo nas despesas antigas (mês apenas).
alter table public.despesas_mes add column data date;
