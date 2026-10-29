function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
}

function isLocalHttpHost(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname === '[::1]'
    || isPrivateIpv4(hostname);
}

/** URL pública do Express, incluindo /api. Não coloque segredos nesta variável. */
export function getApiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!value) throw new Error('Configure EXPO_PUBLIC_API_URL no .env incluindo /api.');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('EXPO_PUBLIC_API_URL deve ser HTTP(S), sem credenciais, query ou fragmento.');
  }
  if (url.protocol === 'http:' && (!__DEV__ || !isLocalHttpHost(url.hostname))) {
    throw new Error('HTTP da API só é permitido para a rede local durante o desenvolvimento; use HTTPS em produção.');
  }
  return url.toString().replace(/\/+$/, '');
}

export const API_TIMEOUT_MS = 15_000;
