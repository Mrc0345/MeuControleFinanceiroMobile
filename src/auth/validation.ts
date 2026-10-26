import type { AuthFields, AuthMode } from './types';

export function validateAuthFields(mode: AuthMode, fields: AuthFields): string | null {
  const email = fields.email.trim();

  if (mode === 'register' && !fields.nome.trim()) return 'Informe seu nome.';
  if (!email) return 'Informe seu e-mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Digite um e-mail válido.';
  if (!fields.senha) return 'Informe sua senha.';

  if (mode === 'register' && fields.senha !== fields.confirmarSenha) {
    return 'As senhas não coincidem.';
  }

  return null;
}
