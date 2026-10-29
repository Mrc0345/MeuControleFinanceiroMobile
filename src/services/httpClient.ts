import { API_TIMEOUT_MS, getApiBaseUrl } from '../config/api';
import type { ApiErrorKind, HttpRequestOptions, HttpResponse } from '../types/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: ApiErrorKind,
    public readonly status?: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null && 'erro' in payload && typeof payload.erro === 'string') {
    return payload.erro;
  }
  return `A API retornou HTTP ${status}.`;
}

/** T descreve o contrato esperado; não substitui validação em runtime. */
export async function httpRequest<T = unknown>(
  path: string,
  options: HttpRequestOptions = {},
): Promise<HttpResponse<T>> {
  let url: string;
  let body: string | undefined;
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
  try {
    if (!path.startsWith('/') || path.startsWith('//') || /[\\#]/.test(path) || /(^|\/)\.{1,2}(\/|\?|$)/.test(path)) {
      throw new Error('Use um caminho relativo à API iniciado por /, como /teste.');
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Timeout deve ser positivo e finito.');
    url = `${getApiBaseUrl()}${path}`;
    body = options.body === undefined ? undefined : JSON.stringify(options.body);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Configuração da API inválida.', 'configuration');
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const headers = new Headers(options.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json, text/plain');
    if (body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(url, {
      method: options.method ?? 'GET', headers, body, signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown = text || null;
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (text && (contentType === 'application/json' || contentType?.endsWith('+json'))) {
      try {
        data = JSON.parse(text);
      } catch {
        // Em erros HTTP, preserva o status mesmo se o JSON estiver inválido.
        if (response.ok) throw new ApiError('A API retornou JSON inválido.', 'invalid_response', response.status);
      }
    }
    if (!response.ok) throw new ApiError(errorMessage(data, response.status), 'http', response.status, data);
    return { status: response.status, data: data as T };
  } catch (error) {
    if (timedOut) throw new ApiError(`A API não respondeu em ${timeoutMs} ms.`, 'timeout');
    if (error instanceof ApiError) throw error;
    throw new ApiError('Não foi possível conectar à API. Verifique a URL, a rede e o servidor.', 'connection');
  } finally {
    clearTimeout(timer);
  }
}
