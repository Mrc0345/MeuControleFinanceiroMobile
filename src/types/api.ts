export interface ApiErrorResponse { erro: string }
export interface ApiMessageResponse { mensagem: string }
export interface ApiCreatedResponse extends ApiMessageResponse { id: number }
export interface HttpResponse<T> { status: number; data: T }
export type ApiErrorKind = 'configuration' | 'http' | 'timeout' | 'connection' | 'invalid_response';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  /** Dados serializáveis em JSON. */
  body?: unknown;
  timeoutMs?: number;
}
