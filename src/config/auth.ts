export type AuthMode = 'mock' | 'api';

export class AuthModeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthModeConfigurationError';
  }
}

export function getAuthMode(): AuthMode {
  const configuredMode = process.env.EXPO_PUBLIC_AUTH_MODE?.trim().toLowerCase();

  if (configuredMode === undefined || configuredMode === '' || configuredMode === 'api') {
    return 'api';
  }

  if (configuredMode !== 'mock') {
    throw new AuthModeConfigurationError('EXPO_PUBLIC_AUTH_MODE deve ser "mock" ou "api".');
  }

  if (!__DEV__) {
    throw new AuthModeConfigurationError('Modo mock de autenticação não é permitido em produção.');
  }

  return 'mock';
}
