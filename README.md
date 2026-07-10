# Gestão Financeira GB

> Sistema de **gestão financeira de aluguéis** — receitas recorrentes mensais
> (imóveis, contratos e cobranças com controle de recebido/pendente) sobre uma
> base de controle de créditos e débitos.

## Módulo de Aluguéis (contas a receber)

- **Imóveis** — cadastro dos imóveis (cada imóvel pode ter vários contratos).
- **Contratos** — imóvel × locatário (pessoa física), valor mensal, dia de
  vencimento, período de vigência e unidade (ex.: "Apto 12", "Loja 1").
- **Cobranças mensais** (`/cobrancas`) — por competência (mês):
  - **Gerar cobranças do mês** cria automaticamente as cobranças dos contratos
    ativos (`fn_gerar_cobrancas`); você pode editar/excluir antes de dar baixa.
  - **Situação** por cobrança: *pago*, *pendente* ou *atrasado* (vencido).
  - **Dar baixa / estornar** e resumo do mês: **previsto / recebido / pendente /
    em atraso**. O dashboard mostra o resumo da competência atual.

Gestão financeira de **empresas** e **pessoas físicas**: créditos, débitos, rateio
automático de créditos, cálculo de saldos, relatórios e dashboard.

**Stack:** Next.js (TypeScript) + Supabase (PostgreSQL + Auth + API REST automática).

## Status

| Fase | Descrição | Situação |
|------|-----------|----------|
| **1. Banco de dados** | Schema, triggers de saldo/auditoria, função de rateio, views, RLS | ✅ Concluída e testada |
| **2. Scaffold + Auth** | Next.js 16 + Supabase client, login/cadastro, proxy de sessão, perfis, dashboard shell | ✅ Concluída e testada |
| **3. Cadastros + Lançamentos** | CRUD Empresas, Pessoas, Créditos, Débitos (abas empresa/pessoa) | ✅ Concluída e testada |
| **4. Rateio** | Tela de rateio com prévia em tempo real, detalhe/participantes, guard de permissão | ✅ Concluída e testada |
| **5. Dashboard** | Indicadores, barra de distribuição e últimos lançamentos | ✅ Concluída e testada |
| **6. Relatórios + Exportação** | 7 relatórios com filtro de período + exportação CSV/Excel/PDF | ✅ Concluída e testada |

**Sistema completo — todos os 13 módulos da especificação implementados.**

### Extras (além do escopo)

- **Interface responsiva** — menu lateral colapsa em drawer no celular/tablet.
- **Gestão de usuários** (`/usuarios`, admin) — define perfil Admin/Operador/Consulta
  pela interface, sem SQL.
- **Extrato por entidade** (`/extrato`) — movimentações com saldo corrente por
  empresa ou pessoa.
- **Auditoria** (`/auditoria`, admin) — consulta o histórico de operações (`logs_auditoria`).
- **Tooltips** — descrições ao passar o mouse nos itens de menu, cards e sessões.

### Deploy

Passo a passo de publicação na Vercel + checklist de produção em **[DEPLOY.md](DEPLOY.md)**.

## Aplicação Next.js (Fase 2)

Stack: **Next.js 16** (App Router, Turbopack) + **Supabase Auth** via `@supabase/ssr`.

Pontos de atenção do Next.js 16 já tratados:
- `middleware.ts` → **`proxy.ts`** (runtime nodejs) — renova a sessão e protege rotas.
- `cookies()` é **assíncrono** — usado com `await` no client de servidor.

Estrutura relevante:
```
src/
  proxy.ts                     # protege rotas + renova sessão (ex-middleware)
  lib/
    supabase/{client,server,proxy}.ts
    database.types.ts          # tipos do schema
    format.ts                  # brl(), dataBR()
  components/
    ui.tsx                     # PageHeader, Tabela, Campo, badges, botões
    excluir-button.tsx         # exclusão com confirmação (client)
    form-lancamento.tsx        # form compartilhado crédito/débito
    tabs-tipo.tsx              # abas Empresas/Pessoas
  app/
    login/{page,actions}.tsx   # login e cadastro (server actions)
    (protected)/
      layout.tsx               # sidebar + logout + guard de auth
      dashboard/page.tsx       # indicadores (Módulo 10)
      empresas/                # CRUD + saldos (Módulos 1, 8)
      pessoas/                 # CRUD + saldos (Módulos 2, 8)
      creditos/                # lançamentos c/ abas empresa|pessoa (3, 5)
      debitos/                 # lançamentos c/ abas empresa|pessoa (4, 6)
```

### Relatórios e exportação (Fase 6)

`src/app/(protected)/relatorios/`:
- `data.ts` — catálogo de 7 relatórios (empresas, pessoas, créditos, débitos,
  rateios, diferenças de arredondamento, resumo geral) e `buildRelatorio()`.
- `page.tsx` — filtro (relatório + período via GET) + tabela + links de exportação.
- `export/route.ts` — Route Handler que gera **CSV** (delimitador `;`, BOM UTF-8),
  **Excel** (`exceljs`, valores monetários como número) e **PDF** (`pdf-lib`,
  A4 paisagem, tabela paginada). Requer sessão autenticada.

### Convenções da Fase 3:
- Valores aceitam formato brasileiro (`1.234,56`) — `parseValorBRL` em `lib/format.ts`.
- Ações de escrita verificam linhas afetadas: RLS filtra silenciosamente, então
  0 linhas = mensagem de permissão ("Exclusão permitida apenas para administradores").
- O campo `usuario` dos lançamentos é preenchido com o nome do perfil logado.

### Rodar localmente

1. Crie um projeto no [supabase.com](https://supabase.com) (plano free).
2. Aplique as migrations `0001`→`0005` no **SQL Editor** (pule `0005` em produção).
3. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Painel → Project Settings → API).
4. `npm install && npm run dev` → http://localhost:3000
5. Crie sua conta na tela de cadastro. Novos usuários entram como perfil **consulta**;
   promova para `administrador` na tabela `perfis` (SQL Editor) para poder cadastrar/editar.

## Banco de dados (Fase 1)

Migrations em `supabase/migrations/`, aplicadas em ordem:

| Arquivo | Conteúdo | Módulos |
|---------|----------|---------|
| `0001_schema.sql` | Tabelas, tipos, índices | 1–7, 11, 12 |
| `0002_functions_triggers.sql` | Auditoria + **função `fn_executar_rateio`** | 7, 11 |
| `0003_views.sql` | Saldos, extratos, relatórios, dashboard | 8, 9, 10 |
| `0004_rls.sql` | Row Level Security por perfil | 12 |
| `0005_seed.sql` | Dados de demonstração (só em dev) | — |
| `0006_rateio_permissao.sql` | Guard de permissão em `fn_executar_rateio` | 12 |
| `0007_ultimos_lancamentos.sql` | View de últimos lançamentos com nome da entidade | 10 |
| `0008_percentual_rateio_ponderado.sql` | Percentual de recebimento + rateio ponderado | 7 |
| `0009_percentual_por_empresa.sql` | Percentual por empresa×pessoa (substitui o global) | 7 |
| `0010_alugueis.sql` | Imóveis, contratos, cobranças mensais + `fn_gerar_cobrancas` | Aluguéis |

### Modelo de dados

- **empresas**, **pessoas_fisicas** — cadastros (Módulos 1–2)
- **creditos_empresa / debitos_empresa** — lançamentos de empresa (3–4)
- **creditos_pessoa / debitos_pessoa** — lançamentos de pessoa (5–6)
- **rateios / rateio_participantes** — rateio automático e o vínculo
  crédito-empresa → créditos-pessoa (7)
- **perfis** — espelha `auth.users` com perfil de acesso (12)
- **logs_auditoria** — trilha de auditoria de todas as operações (11)

### Percentual de recebimento por empresa (rateio ponderado)

O percentual de recebimento é **por empresa × pessoa** (tabela
`empresa_pessoa_percentual`): a mesma pessoa pode receber 50% de uma empresa e
100% de outra. Configurado na **página de cada empresa**. Sem registro = 100%.

No rateio (sempre de uma empresa), cada participante vale uma **cota** proporcional
ao seu percentual naquela empresa. O valor total é sempre distribuído integralmente:

- `peso_total = Σ (percentual_i / 100)` dos participantes (na empresa do rateio)
- `valor_i = trunc(total × (percentual_i/100) / peso_total, 2)`
- o resíduo de arredondamento vai ao 1º participante.

Ex.: R$ 100 na empresa Alfa entre João (100%), Maria (50% na Alfa), Pedro (100%) →
peso 2,5 → João R$ 40, Maria R$ 20, Pedro R$ 40. A mesma Maria em outra empresa
(sem vínculo) receberia 100%.

### Rateio automático (`fn_executar_rateio`)

```sql
select fn_executar_rateio(
  p_id_empresa  => 1,
  p_valor_total => 100.00,
  p_pessoas     => array[1,2,3]::bigint[],
  p_usuario     => 'operador'
);
```

- `valor_individual = trunc(total / n, 2)` — nunca distribui mais que o total.
- `valor_residual = total − (individual × n)` — a diferença de arredondamento é
  **entregue ao primeiro participante** e também registrada no cabeçalho do rateio
  para o relatório de "Diferenças de arredondamento".
- Ex.: `100 / 3` → individual `33,33`, residual `0,01`, 1º recebe `33,34`; soma = `100,00`.

### Saldos e dashboard

Saldos são **views** (`vw_saldo_empresa`, `vw_saldo_pessoa`) — sempre refletem os
lançamentos, sem risco de divergência. `vw_dashboard` e `vw_ultimos_lancamentos`
alimentam o painel (Módulo 10).

## Como aplicar

**Opção A — Supabase CLI (recomendado):**
```bash
npx supabase init          # se ainda não inicializado
npx supabase start         # Postgres local (requer Docker)
npx supabase db reset      # aplica todas as migrations em ordem
```

**Opção B — Projeto Supabase na nuvem:**
Cole o conteúdo de cada migration (0001→0005) no **SQL Editor** do painel, em ordem.
Pule `0005_seed.sql` em produção.

## Verificação

A lógica financeira (rateio, resíduo de arredondamento, saldos, dashboard,
auditoria) foi testada contra um Postgres real via PGlite. As migrations 0001–0003
foram aplicadas sem erro e todas as asserções passaram.

> Nota: `0004_rls.sql` depende do schema `auth` do Supabase (`auth.users`,
> `auth.uid()`), então é validado ao aplicar em um projeto Supabase real.
