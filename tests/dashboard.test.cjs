const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseDashboardResponse, recentTransactions, formatTransactionDate, formatMoney, loadDashboard } = require('../src/services/dashboardService.ts');

const transaction = { id: 1, descricao: 'Salário', tipo: 'receita', valor: '1250.50', data: '2026-10-28T00:00:00.000Z' };
const payload = { saldo: 1000, receitas: 1250.5, despesas: 250.5, transacoes: [transaction] };

test('normalizes MySQL decimals and calendar dates, preserving server totals', () => {
  const result = parseDashboardResponse(payload);
  assert.equal(result.saldo, 1000);
  assert.equal(result.transacoes[0].valor, 1250.5);
  assert.equal(result.transacoes[0].data, '2026-10-28');
  assert.equal(formatTransactionDate(result.transacoes[0].data), '28/10/2026');
  assert.match(formatMoney(-10.5), /10,50/);
});

test('accepts empty accounts and negative balances', () => {
  assert.deepEqual(parseDashboardResponse({ saldo: 0, receitas: 0, despesas: 0, transacoes: [] }).transacoes, []);
  assert.equal(parseDashboardResponse({ ...payload, saldo: -500 }).saldo, -500);
});

test('rejects malformed financial values instead of silently showing zero', () => {
  for (const saldo of [null, '', ' ', true, 'NaN', Infinity, {}, '1,50']) {
    assert.throws(() => parseDashboardResponse({ ...payload, saldo }));
  }
  assert.throws(() => parseDashboardResponse({ ...payload, despesas: -1 }));
  assert.throws(() => parseDashboardResponse({ ...payload, transacoes: null }));
});

test('rejects invalid transactions and impossible calendar dates', () => {
  for (const patch of [{ id: '1' }, { tipo: 'transferencia' }, { valor: -1 }, { descricao: '' }, { data: '2026-02-30' }]) {
    assert.throws(() => parseDashboardResponse({ ...payload, transacoes: [{ ...transaction, ...patch }] }));
  }
});

test('returns five newest transactions without mutating the source', () => {
  const source = Array.from({ length: 7 }, (_, index) => ({ ...transaction, id: index + 1, valor: 10, data: `2026-10-${20 + index}` }));
  const before = source.map((item) => item.id);
  assert.deepEqual(recentTransactions(source).map((item) => item.id), [7, 6, 5, 4, 3]);
  assert.deepEqual(source.map((item) => item.id), before);
});

test('requests the existing endpoint with a bearer token', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://example.com/api/transacoes');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(options.headers.Accept, 'application/json');
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  assert.equal((await loadDashboard('https://example.com/api/', 'test-token', new AbortController().signal)).saldo, 1000);
});

test('reports unauthorized and server errors without accepting their payloads', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('Unauthorized', { status: 401 }));
  await assert.rejects(loadDashboard('https://example.com/api', 'test-token', new AbortController().signal), { status: 401 });
  fetchMock.mock.mockImplementation(async () => new Response('Unavailable', { status: 503 }));
  await assert.rejects(loadDashboard('https://example.com/api', 'test-token', new AbortController().signal), { status: 503 });
});

test('rejects missing configuration and token before making a request', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected request'); });
  await assert.rejects(loadDashboard(undefined, 'token', new AbortController().signal), /EXPO_PUBLIC_API_URL/);
  await assert.rejects(loadDashboard('https://example.com/api', '', new AbortController().signal), { status: 401 });
  await assert.rejects(loadDashboard('https://example.com/api?secret=x', 'token', new AbortController().signal), /URL/);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('propagates cancellation to the HTTP request', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    if (signal.aborted) return reject(new Error('Canceled'));
    signal.addEventListener('abort', () => reject(new Error('Canceled')), { once: true });
  }));
  const controller = new AbortController();
  const request = loadDashboard('https://example.com/api', 'test-token', controller.signal);
  controller.abort();
  await assert.rejects(request, /Canceled/);
});

test('aborts a stalled request after fifteen seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
  }));
  const request = loadDashboard('https://example.com/api', 'test-token', new AbortController().signal);
  const rejected = assert.rejects(request, /15 segundos/);
  t.mock.timers.tick(15000);
  await rejected;
});
