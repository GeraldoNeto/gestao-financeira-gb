# Deploy em produção

Guia para publicar o sistema na **Vercel** (recomendado para Next.js) usando o
Supabase como banco/auth.

## 1. Pré-requisitos

- Conta no [GitHub](https://github.com) (para hospedar o código)
- Conta na [Vercel](https://vercel.com) (deploy)
- O projeto Supabase já criado, com as migrations `0001`→`0009` aplicadas

## 2. Código no GitHub

✅ Já publicado: **https://github.com/GeraldoNeto/gestao-financeira-gb** (branch `main`).

> O `.gitignore` ignora `.env.local` (suas credenciais **não** vão para o Git).
> Cada `git push` futuro dispara um novo deploy na Vercel (após o passo 3).

## 3. Importar na Vercel

1. Em vercel.com → **Add New → Project** → **Import** o repositório
   `GeraldoNeto/gestao-financeira-gb` (autorize o GitHub se pedido).
2. A Vercel detecta Next.js automaticamente (build `next build`, sem ajustes).
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://SEU-PROJETO.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sua chave publishable (`sb_publishable_...`)
4. **Deploy**. Ao final você terá uma URL como `https://credito-debito.vercel.app`.

> A chave publishable/anon é pública por design — a segurança vem da RLS no banco.

## 4. Configurar o Auth do Supabase para o domínio de produção

No painel do Supabase → **Authentication → URL Configuration**:

- **Site URL**: a URL da Vercel (ex.: `https://credito-debito.vercel.app`)
- **Redirect URLs**: adicione a mesma URL (necessário para os links de
  confirmação de e-mail apontarem para produção)

## 5. Checklist de produção

- [ ] ⚠️ **Desativar o autocadastro público.** A leitura já exige um **perfil ativo**
      (migration 0011) e as views respeitam a RLS, mas o cadastro público ainda cria
      usuários. Em **Supabase → Authentication → Sign In / Providers → Email**, desligue
      **"Allow new users to sign up"**. Crie os usuários em **Authentication → Users →
      Add user** e defina o perfil na tela **Usuários** do sistema.
      (O autocadastro já foi removido da tela de login do app.)
- [ ] **Remover o usuário de teste** `admin@teste.com` (senha conhecida). Crie o
      seu usuário real pela tela de cadastro e promova-o a administrador em
      **Usuários**; depois exclua o de teste no painel Supabase (Authentication).
- [ ] **Limpar os dados de demonstração** (empresas Alfa/Beta/Gamma, pessoas e
      rateios de teste), se não forem necessários — veja abaixo.
- [ ] **Confirmação de e-mail**: por padrão o Supabase exige confirmação no
      cadastro. Mantenha ativo em produção (Authentication → Providers → Email).
- [ ] **Backups**: o Supabase faz backup diário automático nos planos pagos
      (Pro+). No plano free, considere exportar periodicamente.
- [ ] Revisar quem tem perfil **administrador**.

### Limpar dados de demonstração (opcional)

Rode no SQL Editor do Supabase (apaga movimentações e cadastros de teste,
preserva a estrutura):

```sql
truncate table
  public.rateio_participantes,
  public.rateios,
  public.creditos_pessoa,
  public.debitos_pessoa,
  public.creditos_empresa,
  public.debitos_empresa,
  public.empresa_pessoa_percentual,
  public.logs_auditoria
  restart identity cascade;

delete from public.pessoas_fisicas;
delete from public.empresas;
```

## 6. Atualizações futuras

Cada `git push` para a branch `main` dispara um novo deploy automático na Vercel.
Novas migrations devem ser aplicadas no Supabase (SQL Editor ou `supabase db push`).
