export type AuthMode = 'login' | 'register';

export type AuthFields = {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
};
