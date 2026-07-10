/**
 * Tipos do banco (gerados manualmente a partir das migrations da Fase 1).
 * Para regenerar a partir de um projeto Supabase real:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */

export type StatusRegistro = 'ativo' | 'inativo'
export type PerfilAcesso = 'administrador' | 'operador' | 'consulta'

export type Empresa = {
  id_empresa: number
  nome_empresa: string
  cnpj: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  data_cadastro: string
  status: StatusRegistro
}

export type PessoaFisica = {
  id_pessoa: number
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  data_cadastro: string
  status: StatusRegistro
}

export type EmpresaPessoaPercentual = {
  id_empresa: number
  id_pessoa: number
  percentual: number
}

export type CreditoEmpresa = {
  id_credito: number
  id_empresa: number
  data_credito: string
  historico: string | null
  valor: number
  observacao: string | null
  usuario: string | null
  data_lancamento: string
}

export type DebitoEmpresa = {
  id_debito: number
  id_empresa: number
  data_debito: string
  historico: string | null
  valor: number
  observacao: string | null
  usuario: string | null
  data_lancamento: string
}

export type CreditoPessoa = {
  id_credito: number
  id_pessoa: number
  data: string
  historico: string | null
  valor: number
  origem_rateio: number | null
  usuario: string | null
  data_lancamento: string
}

export type DebitoPessoa = {
  id_debito: number
  id_pessoa: number
  data: string
  historico: string | null
  valor: number
  usuario: string | null
  data_lancamento: string
}

export type Rateio = {
  id_rateio: number
  id_empresa: number
  id_credito_empresa: number | null
  valor_total: number
  num_pessoas: number
  valor_individual: number
  valor_residual: number
  data: string
  usuario: string | null
  data_lancamento: string
}

export type RateioParticipante = {
  id_participante: number
  id_rateio: number
  id_pessoa: number
  id_credito_pessoa: number | null
  valor: number
  percentual: number
  recebeu_residual: boolean
}

export type Perfil = {
  id: string
  nome: string
  email: string | null
  perfil: PerfilAcesso
  status: StatusRegistro
  data_cadastro: string
}

export type LogAuditoria = {
  id: number
  tabela: string
  operacao: string
  registro_id: string | null
  usuario: string | null
  dados_antigos: unknown
  dados_novos: unknown
  criado_em: string
}

export type RateioView = {
  id_rateio: number
  id_empresa: number
  nome_empresa: string
  valor_total: number
  num_pessoas: number
  valor_individual: number
  valor_residual: number
  data: string
  usuario: string | null
  qtd_creditos_gerados: number
}

export type SaldoEmpresa = {
  id_empresa: number
  nome_empresa: string
  status: StatusRegistro
  total_creditos: number
  total_debitos: number
  saldo: number
}

export type SaldoPessoa = {
  id_pessoa: number
  nome: string
  status: StatusRegistro
  total_creditos: number
  total_debitos: number
  saldo: number
}

export type ExtratoLinha = {
  tipo: 'CREDITO' | 'DEBITO'
  data: string
  historico: string | null
  valor: number
  data_lancamento: string
}

export type UltimoLancamento = {
  tipo: 'CREDITO' | 'DEBITO'
  tipo_entidade: 'empresa' | 'pessoa'
  id: number
  entidade_id: number
  entidade_nome: string
  historico: string | null
  valor: number
  data_lancamento: string
}

export type Dashboard = {
  empresas_ativas: number
  empresas_total: number
  empresas_creditos: number
  empresas_debitos: number
  empresas_saldo: number
  pessoas_ativas: number
  pessoas_total: number
  pessoas_creditos: number
  pessoas_debitos: number
  pessoas_saldo: number
  total_recebido: number
  total_distribuido: number
  total_debitado: number
  diferenca_pendente: number
}

type TableShape<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

type ViewShape<Row> = {
  Row: Row
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      empresas: TableShape<Empresa>
      pessoas_fisicas: TableShape<PessoaFisica>
      creditos_empresa: TableShape<CreditoEmpresa>
      debitos_empresa: TableShape<DebitoEmpresa>
      creditos_pessoa: TableShape<CreditoPessoa>
      debitos_pessoa: TableShape<DebitoPessoa>
      rateios: TableShape<Rateio>
      rateio_participantes: TableShape<RateioParticipante>
      empresa_pessoa_percentual: TableShape<EmpresaPessoaPercentual>
      perfis: TableShape<Perfil>
      logs_auditoria: TableShape<LogAuditoria>
    }
    Views: {
      vw_saldo_empresa: ViewShape<SaldoEmpresa>
      vw_saldo_pessoa: ViewShape<SaldoPessoa>
      vw_dashboard: ViewShape<Dashboard>
      vw_rateios: ViewShape<RateioView>
      vw_ultimos_lancamentos: ViewShape<UltimoLancamento>
      vw_extrato_empresa: ViewShape<ExtratoLinha & { id_empresa: number }>
      vw_extrato_pessoa: ViewShape<ExtratoLinha & { id_pessoa: number }>
    }
    Functions: {
      fn_executar_rateio: {
        Args: {
          p_id_empresa: number
          p_valor_total: number
          p_pessoas: number[]
          p_id_credito_empresa?: number
          p_historico?: string
          p_usuario?: string
          p_data?: string
        }
        Returns: number
      }
    }
  }
}
