type ErroDB = { code?: string; message: string }

/** Traduz erros do Postgres/RLS para mensagens amigáveis. */
export function msgErroDB(error: ErroDB): string {
  switch (error.code) {
    case '42501':
      return 'Seu perfil não tem permissão para esta operação.'
    case '23503':
      return 'Este registro possui lançamentos vinculados e não pode ser excluído.'
    case '23514':
      return 'Valor inválido para este campo.'
    case '23505':
      return 'Já existe um registro com estes dados.'
    default:
      return error.message
  }
}
