const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-typescript.cjs');
const load = createLoader({ development: true });
const service = load('src/services/transactionService.ts');
const fields = { descricao: ' Mercado ', valor: '1250,50', data: '07/11/2026', categoria: ' Alimentação ', forma_pagamento: ' Pix ' };
const session = { version: 1, source: 'api', token: 'test-token', usuario: { id: 1, nome: 'Teste', email: 'teste@example.invalid' } };
const respond = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function configure(t) {
  const previous = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid/api';
  t.after(() => {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previous;
  });
}

test('normalizes Brazilian input to exact decimal strings and real calendar dates', () => {
  assert.deepEqual(service.normalizeTransaction(fields, 'despesa'), {
    descricao: 'Mercado', tipo: 'despesa', valor: '1250.50', data: '2026-11-07', categoria: 'Alimentação', forma_pagamento: 'Pix',
  });
  assert.equal(service.normalizeAmount('0001,5'), '1.50');
  assert.equal(service.normalizeAmount('9999999999999.99'), '9999999999999.99');
  assert.equal(service.normalizeDate('29/02/2024'), '2024-02-29');
  assert.equal(service.normalizeTransaction({ ...fields, categoria: '', forma_pagamento: '' }, 'receita').categoria, null);
});

test('rejects ambiguous values, zero, excess precision and impossible dates before HTTP', async (t) => {
  configure(t);
  const mock = t.mock.method(globalThis, 'fetch', () => { throw Error('Unexpected HTTP'); });
  for (const valor of ['', '0', '-1', '1.250,50', '1,250.50', '1,234', '1e3', 'NaN', '10000000000000', '0.001']) {
    await assert.rejects(service.saveTransaction(session, { ...fields, valor }, 'despesa'));
  }
  for (const data of ['29/02/2026', '31/04/2026', '00/01/2026', '07/13/2026', '2026-11-07', '01/01/0001']) {
    assert.throws(() => service.normalizeDate(data));
  }
  for (const patch of [{ descricao: ' ' }, { descricao: 'x'.repeat(201) }, { categoria: 'x'.repeat(101) }, { forma_pagamento: 'x'.repeat(51) }]) {
    await assert.rejects(service.saveTransaction(session, { ...fields, ...patch }, 'receita'));
  }
  assert.equal(mock.mock.callCount(), 0);
});

test('lists authenticated transactions and preserves category and payment on edit', async (t) => {
  configure(t);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://example.invalid/api/transacoes');
    assert.equal(options.headers.get('Authorization'), 'Bearer test-token');
    return respond({ saldo: -1250.5, receitas: 0, despesas: 1250.5, transacoes: [
      { id: 1, descricao: 'Mercado', valor: '1250.50', tipo: 'despesa', data: '2026-11-07T00:00:00.000Z', categoria: 'Alimentação', forma_pagamento: 'Pix' },
    ] });
  });
  const [item] = await service.listTransactions(session);
  assert.equal(item.valor, 1250.5); assert.equal(item.data, '2026-11-07');
  assert.equal(item.categoria, 'Alimentação'); assert.equal(item.forma_pagamento, 'Pix');
});

test('does not accept malformed financial responses or category data', async (t) => {
  configure(t);
  const mock = t.mock.method(globalThis, 'fetch', async () => respond({ saldo: null, receitas: 0, despesas: 0, transacoes: [] }));
  await assert.rejects(service.listTransactions(session));
  mock.mock.mockImplementation(async () => respond({ saldo: 1, receitas: 1, despesas: 0, transacoes: [
    { id: 1, descricao: 'Entrada', tipo: 'receita', valor: '1.00', data: '2026-11-07', categoria: { bad: true } },
  ] }));
  await assert.rejects(service.listTransactions(session), { kind: 'invalid_response' });
});

test('creates, updates and deletes via real route contract with Bearer and no user ID in body', async (t) => {
  configure(t);
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push([url, options.method]);
    assert.equal(options.headers.get('Authorization'), 'Bearer test-token');
    if (options.body) {
      const body = JSON.parse(options.body);
      assert.deepEqual(body, service.normalizeTransaction(fields, 'despesa'));
      assert.equal(body.usuario_id, undefined);
    }
    return respond({ mensagem: 'Operação confirmada', ...(options.method === 'POST' ? { id: 25 } : {}) }, options.method === 'POST' ? 201 : 200);
  });
  await service.saveTransaction(session, fields, 'despesa');
  await service.saveTransaction(session, fields, 'despesa', 25);
  await service.deleteTransaction(session, 25);
  assert.deepEqual(calls, [
    ['https://example.invalid/api/transacoes', 'POST'],
    ['https://example.invalid/api/transacoes/25', 'PUT'],
    ['https://example.invalid/api/transacoes/25', 'DELETE'],
  ]);
});

test('blocks mock sessions, missing JWT and invalid IDs before network access', async (t) => {
  configure(t);
  const mock = t.mock.method(globalThis, 'fetch', () => { throw Error('Unexpected HTTP'); });
  for (const denied of [null, { ...session, token: '' }, { ...session, source: 'mock', token: null }]) {
    await assert.rejects(service.listTransactions(denied));
    await assert.rejects(service.saveTransaction(denied, fields, 'receita'));
    await assert.rejects(service.deleteTransaction(denied, 1));
  }
  for (const id of [0, -1, 1.5, NaN, Infinity, '1/../../usuarios']) {
    await assert.rejects(service.deleteTransaction(session, id));
    await assert.rejects(service.saveTransaction(session, fields, 'despesa', id));
  }
  assert.equal(mock.mock.callCount(), 0);
});

test('preserves HTTP errors including expired session and missing ownership', async (t) => {
  configure(t);
  const mock = t.mock.method(globalThis, 'fetch', async () => respond({ erro: 'Sessão inválida' }, 401));
  await assert.rejects(service.listTransactions(session), { status: 401 });
  mock.mock.mockImplementation(async () => respond({ erro: 'Sem permissão' }, 404));
  await assert.rejects(service.saveTransaction(session, fields, 'despesa', 1), { status: 404 });
  await assert.rejects(service.deleteTransaction(session, 1), { status: 404 });
});

test('requires meaningful server confirmation and does not retry mutations automatically', async (t) => {
  configure(t);
  const mock = t.mock.method(globalThis, 'fetch', async () => respond({ mensagem: 'ok' }, 201));
  await assert.rejects(service.saveTransaction(session, fields, 'receita'), { kind: 'invalid_response' });
  mock.mock.mockImplementation(async () => respond({ mensagem: '' }));
  await assert.rejects(service.deleteTransaction(session, 1), { kind: 'invalid_response' });
  assert.equal(mock.mock.callCount(), 2);
});

test('filters month, category and type, sorts by date/id, and preserves original array', () => {
  const items = [
    { id: 1, tipo: 'despesa', data: '2026-11-01', categoria: 'Alimentação' },
    { id: 2, tipo: 'receita', data: '2026-11-07', categoria: 'Salário' },
    { id: 3, tipo: 'despesa', data: '2026-10-07', categoria: 'Alimentação' },
    { id: 4, tipo: 'despesa', data: '2026-11-01', categoria: 'ALIMENTAÇÃO' },
  ];
  assert.deepEqual(service.filterTransactions(items, '11/2026', ' alimentação ', 'despesa').map(x => x.id), [4, 1]);
  assert.deepEqual(service.filterTransactions(items, '', '').map(x => x.id), [2, 4, 1, 3]);
  assert.deepEqual(items.map(x => x.id), [1, 2, 3, 4]);
  assert.deepEqual(service.filterTransactions(items, '01/2025', ''), []);
  for (const month of ['13/2026', '11/26', '2026-11', '00/2026']) assert.throws(() => service.filterTransactions(items, month, ''));
});

test('cancels list requests on navigation and does not send already cancelled requests', async (t) => {
  configure(t);
  const mock = t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true });
  }));
  const controller = new AbortController();
  const request = service.listTransactions(session, controller.signal);
  controller.abort();
  await assert.rejects(request);
  const before = mock.mock.callCount();
  await assert.rejects(service.listTransactions(session, controller.signal));
  assert.equal(mock.mock.callCount(), before);
});
