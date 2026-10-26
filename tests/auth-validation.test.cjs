const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateAuthFields } = require('../src/auth/validation.ts');

const fields = { nome: 'Marcus', email: 'marcus@example.com', senha: 'senha123', confirmarSenha: 'senha123' };

test('login aceita e-mail e senha preenchidos', () => {
  assert.equal(validateAuthFields('login', fields), null);
});

test('cadastro exige nome e e-mail com formato válido', () => {
  assert.equal(validateAuthFields('register', { ...fields, nome: '  ' }), 'Informe seu nome.');
  assert.equal(validateAuthFields('register', { ...fields, email: 'email-invalido' }), 'Digite um e-mail válido.');
});

test('cadastro exige confirmação igual à senha', () => {
  assert.equal(validateAuthFields('register', { ...fields, confirmarSenha: 'outra' }), 'As senhas não coincidem.');
});

test('login não exige nome nem confirmação de senha', () => {
  assert.equal(validateAuthFields('login', { ...fields, nome: '', confirmarSenha: '' }), null);
});
