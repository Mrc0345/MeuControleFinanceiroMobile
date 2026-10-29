import { ApiError, httpRequest } from './httpClient';
import type { HttpResponse } from '../types/api';

/** Testa somente o HTTP do Express, sem verificar banco ou login. */
export async function testApiConnection(): Promise<HttpResponse<string>> {
  const response = await httpRequest<unknown>('/teste');
  if (response.data !== 'GET funcionando') {
    throw new ApiError('Resposta inesperada de GET /api/teste.', 'invalid_response', response.status);
  }
  return { status: response.status, data: response.data };
}
