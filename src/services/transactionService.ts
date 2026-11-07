import { ApiError, httpRequest } from './httpClient';
import { parseDashboardResponse, type DashboardTransaction } from './dashboardService';
import type { AuthenticatedSession } from '../types/auth';

export type TransactionKind = 'receita' | 'despesa';
export type Transaction = DashboardTransaction & { categoria: string | null; forma_pagamento: string | null };
export type TransactionFields = {
  descricao: string;
  valor: string;
  data: string;
  categoria: string;
  forma_pagamento: string;
};
export type TransactionInput = {
  descricao: string;
  tipo: TransactionKind;
  valor: string;
  data: string;
  categoria: string | null;
  forma_pagamento: string | null;
};

function text(value: string, label: string, max: number, optional = false): string | null {
  const normalized = value.trim();
  if (!normalized && optional) return null;
  if (!normalized || normalized.length > max) throw new Error(`${label}: informe até ${max} caracteres.`);
  return normalized;
}

// Reject ambiguous thousands separators rather than guessing a financial value.
export function normalizeAmount(value: string): string {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Informe um valor positivo, sem separador de milhar e com até duas casas decimais.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents <= 0n) throw new Error('O valor deve ser maior que zero.');
  return `${BigInt(whole)}.${fraction.padEnd(2, '0')}`;
}

export function normalizeDate(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match || Number(match[3]) < 1000) throw new Error('Informe uma data válida em DD/MM/AAAA.');
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    throw new Error('Informe uma data de calendário válida.');
  }
  return iso;
}

export function normalizeTransaction(fields: TransactionFields, tipo: TransactionKind): TransactionInput {
  if (tipo !== 'receita' && tipo !== 'despesa') throw new Error('Tipo de movimentação inválido.');
  return {
    descricao: text(fields.descricao, 'Descrição', 200)!, tipo,
    valor: normalizeAmount(fields.valor), data: normalizeDate(fields.data),
    categoria: text(fields.categoria, 'Categoria', 100, true),
    forma_pagamento: text(fields.forma_pagamento, 'Forma de pagamento', 50, true),
  };
}

function authorization(session: AuthenticatedSession | null): Record<string, string> {
  if (session?.source !== 'api' || !session.token?.trim()) {
    throw new ApiError('As movimentações exigem uma conta real. Entre no modo API.', 'configuration');
  }
  return { Authorization: `Bearer ${session.token}` };
}

function idPath(id: number): string {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Identificador de movimentação inválido.');
  return `/transacoes/${id}`;
}

function optionalResponseText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new ApiError('Categoria ou forma de pagamento inválida na API.', 'invalid_response');
  return value;
}

export async function listTransactions(session: AuthenticatedSession | null, signal?: AbortSignal): Promise<Transaction[]> {
  const response = await httpRequest('/transacoes', { headers: authorization(session), signal });
  const parsed = parseDashboardResponse(response.data);
  const raw = (response.data as { transacoes: Record<string, unknown>[] }).transacoes;
  return parsed.transacoes.map((item, index) => ({
    ...item, categoria: optionalResponseText(raw[index].categoria),
    forma_pagamento: optionalResponseText(raw[index].forma_pagamento),
  }));
}

export async function saveTransaction(
  session: AuthenticatedSession | null, fields: TransactionFields, tipo: TransactionKind, id?: number,
): Promise<void> {
  const headers = authorization(session);
  const body = normalizeTransaction(fields, tipo);
  const response = await httpRequest(id === undefined ? '/transacoes' : idPath(id), {
    method: id === undefined ? 'POST' : 'PUT', headers, body,
  });
  const data = response.data as { mensagem?: unknown; id?: unknown } | null;
  if (!data || typeof data.mensagem !== 'string' || !data.mensagem.trim()
    || (id === undefined && (typeof data.id !== 'number' || !Number.isSafeInteger(data.id) || data.id <= 0))) {
    throw new ApiError('A API não confirmou o salvamento. Atualize a lista antes de tentar novamente.', 'invalid_response');
  }
}

export async function deleteTransaction(session: AuthenticatedSession | null, id: number): Promise<void> {
  const response = await httpRequest(idPath(id), { method: 'DELETE', headers: authorization(session) });
  const data = response.data as { mensagem?: unknown } | null;
  if (!data || typeof data.mensagem !== 'string' || !data.mensagem.trim()) {
    throw new ApiError('A API não confirmou a exclusão. Atualize a lista para conferir.', 'invalid_response');
  }
}

export function filterTransactions(items: Transaction[], month: string, category: string, tipo?: TransactionKind): Transaction[] {
  const trimmed = month.trim();
  if (trimmed && !/^(0[1-9]|1[0-2])\/[1-9]\d{3}$/.test(trimmed)) throw new Error('Filtre o mês em MM/AAAA ou deixe vazio.');
  const isoMonth = trimmed ? `${trimmed.slice(3)}-${trimmed.slice(0, 2)}` : '';
  const search = category.trim().toLocaleLowerCase('pt-BR');
  return items.filter(item => (!tipo || item.tipo === tipo)
    && (!isoMonth || item.data.startsWith(isoMonth))
    && (!search || item.categoria?.toLocaleLowerCase('pt-BR').includes(search)))
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
}
