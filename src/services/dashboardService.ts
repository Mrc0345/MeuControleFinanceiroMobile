export type DashboardTransaction = {
  id: number;
  descricao: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  data: string;
};

export type DashboardSummary = {
  saldo: number;
  receitas: number;
  despesas: number;
  transacoes: DashboardTransaction[];
};

export function getDashboardAccessMessage(session: { source: 'api' | 'mock'; token: string | null } | null): string | null {
  if (session?.source === 'mock') {
    return 'Modo demonstração: o resumo financeiro exige uma conta real. Configure o modo API e entre novamente.';
  }
  if (!session?.token) return 'Entre novamente para acessar suas finanças.';
  return null;
}

export type DashboardErrorKind = 'http' | 'configuration' | 'connection' | 'timeout' | 'invalid_response';
export type DashboardFailure = {
  kind: 'session' | DashboardErrorKind;
  title: string;
  message: string;
  action: 'retry' | 'signOut' | 'checkConfiguration';
};

export class DashboardRequestError extends Error {
  readonly status?: number;
  readonly kind: DashboardErrorKind;
  constructor(message: string, status?: number, kind: DashboardErrorKind = 'http') {
    super(message);
    this.name = 'DashboardRequestError';
    this.status = status;
    this.kind = kind;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function amount(value: unknown): number {
  // MySQL DECIMAL fields can arrive as strings; never coerce null or empty text to zero.
  if (typeof value !== 'number' && !(typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value))) {
    throw new Error('Valor financeiro inválido na resposta da API.');
  }
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error('Valor financeiro inválido na resposta da API.');
  return result;
}

function calendarDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) {
    throw new Error('Data inválida na resposta da API.');
  }
  const day = value.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
    throw new Error('Data inválida na resposta da API.');
  }
  return day;
}

export function parseDashboardResponse(value: unknown): DashboardSummary {
  if (!record(value) || !Array.isArray(value.transacoes)) throw new Error('O backend respondeu em um formato inesperado.');
  const saldo = amount(value.saldo);
  const receitas = amount(value.receitas);
  const despesas = amount(value.despesas);
  if (receitas < 0 || despesas < 0) throw new Error('Totais inválidos na resposta da API.');
  const transacoes = value.transacoes.map((item): DashboardTransaction => {
    if (!record(item) || typeof item.id !== 'number' || !Number.isSafeInteger(item.id) || item.id <= 0
      || typeof item.descricao !== 'string' || !item.descricao.trim()
      || (item.tipo !== 'receita' && item.tipo !== 'despesa')) {
      throw new Error('Movimentação inválida na resposta da API.');
    }
    const valor = amount(item.valor);
    if (valor < 0) throw new Error('Valor de movimentação inválido na resposta da API.');
    return { id: item.id, descricao: item.descricao, tipo: item.tipo, valor, data: calendarDate(item.data) };
  });
  return { saldo, receitas, despesas, transacoes };
}

export function recentTransactions(transactions: DashboardTransaction[]): DashboardTransaction[] {
  return [...transactions].sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id).slice(0, 5);
}

export function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatTransactionDate(value: string): string {
  // Calendar dates must not shift to the previous day in Brazilian time zones.
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export async function loadDashboard(baseUrl: string | undefined, token: string, signal: AbortSignal): Promise<DashboardSummary> {
  if (!baseUrl?.trim()) throw new DashboardRequestError('Configure EXPO_PUBLIC_API_URL para conectar ao backend.', undefined, 'configuration');
  let url: URL;
  try { url = new URL(baseUrl.trim()); }
  catch { throw new DashboardRequestError('Configure uma URL válida.', undefined, 'configuration'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new DashboardRequestError('Configure uma URL HTTP ou HTTPS da API, sem credenciais, parâmetros ou fragmentos.', undefined, 'configuration');
  }
  if (!token.trim()) throw new DashboardRequestError('Entre novamente para acessar suas finanças.', 401);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel);
  if (signal.aborted) cancel();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
  try {
    const response = await fetch(`${url.toString().replace(/\/$/, '')}/transacoes`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (response.status === 401) throw new DashboardRequestError('Sua sessão expirou ou é inválida. Saia e entre novamente.', 401);
    if (!response.ok) throw new DashboardRequestError(`Não foi possível carregar o resumo (HTTP ${response.status}).`, response.status);
    try { return parseDashboardResponse(await response.json()); }
    catch { throw new DashboardRequestError('Não foi possível validar os valores recebidos.', response.status, 'invalid_response'); }
  } catch (error) {
    if (signal.aborted) throw error;
    if (timedOut) throw new DashboardRequestError('A API não respondeu em 15 segundos. Tente novamente.', undefined, 'timeout');
    if (error instanceof TypeError) throw new DashboardRequestError('Não foi possível conectar à API. Verifique a rede e o backend.', undefined, 'connection');
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}

/** Presentation is separate from diagnostics: never expose server text or technical errors. */
export function getDashboardFailure(error: unknown): DashboardFailure {
  if (error instanceof DashboardRequestError) {
    if (error.status === 401 || error.status === 403) return {
      kind: 'session', title: 'Entre novamente',
      message: 'Não foi possível autorizar a consulta. Saia e entre com sua conta para continuar.', action: 'signOut',
    };
    if (error.kind === 'configuration') return {
      kind: 'configuration', title: 'A conexão precisa ser configurada',
      message: 'Peça à equipe responsável pelo aplicativo para revisar o endereço de conexão e reiniciar o aplicativo. Depois, confira a conexão novamente.', action: 'checkConfiguration',
    };
    if (error.kind === 'connection') return {
      kind: 'connection', title: 'Não foi possível conectar',
      message: 'Confira sua conexão com a internet ou com a rede local e tente novamente.', action: 'retry',
    };
    if (error.kind === 'timeout') return {
      kind: 'timeout', title: 'A consulta demorou mais que o esperado',
      message: 'O serviço não respondeu a tempo. Aguarde um momento e tente novamente.', action: 'retry',
    };
    if (error.kind === 'invalid_response') return {
      kind: 'invalid_response', title: 'Não foi possível conferir os valores',
      message: 'Os dados recebidos não puderam ser validados. Tente atualizar novamente; se continuar, avise a equipe responsável pelo aplicativo.', action: 'retry',
    };
  }
  return { kind: 'http', title: 'Resumo indisponível no momento',
    message: 'Não foi possível consultar suas movimentações. Aguarde um momento e tente novamente.', action: 'retry' };
}
