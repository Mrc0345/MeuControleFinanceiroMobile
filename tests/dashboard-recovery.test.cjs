const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DashboardRequestError, getDashboardFailure, loadDashboard } = require('../src/services/dashboardService.ts');

test('session errors offer sign-out instead of repeating an unauthorized request', () => {
  for (const status of [401, 403]) {
    const result = getDashboardFailure(new DashboardRequestError('private server diagnostic', status));
    assert.equal(result.kind, 'session'); assert.equal(result.action, 'signOut');
    assert.doesNotMatch(result.message, /private|HTTP|JWT/);
  }
});

test('configuration, connectivity, timeout and invalid data have distinct recovery messages', () => {
  const results = ['configuration', 'connection', 'timeout', 'invalid_response'].map(kind =>
    getDashboardFailure(new DashboardRequestError('secret diagnostic', undefined, kind)));
  assert.equal(new Set(results.map(x => x.title)).size, 4);
  assert.equal(results[0].action, 'checkConfiguration');
  for (const result of results.slice(1)) assert.equal(result.action, 'retry');
  for (const result of results) assert.doesNotMatch(result.message, /secret|HTTP|API|backend/);
});

test('unknown and server errors do not display raw technical details', () => {
  assert.equal(getDashboardFailure(new Error('token=private')).action, 'retry');
  assert.doesNotMatch(getDashboardFailure(new Error('token=private')).message, /token|private/);
  assert.equal(getDashboardFailure(new DashboardRequestError('HTTP 503', 503)).kind, 'http');
});

test('configuration errors are classified before network access', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', () => { throw Error('unexpected HTTP'); });
  for (const base of [undefined, '', 'not a URL', 'https://example.invalid/api?token=private']) {
    await assert.rejects(loadDashboard(base, 'token', new AbortController().signal), { kind: 'configuration' });
  }
  assert.equal(mock.mock.callCount(), 0);
});

test('malformed successful responses are classified without accepting their totals', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('{broken', { status: 200 }));
  await assert.rejects(loadDashboard('https://example.invalid/api', 'token', new AbortController().signal), { kind: 'invalid_response' });
  mock.mock.mockImplementation(async () => new Response(JSON.stringify({ saldo: null, receitas: 0, despesas: 0, transacoes: [] })));
  await assert.rejects(loadDashboard('https://example.invalid/api', 'token', new AbortController().signal), { kind: 'invalid_response' });
});

test('network and timeout remain distinguishable from server errors', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(loadDashboard('https://example.invalid/api', 'token', new AbortController().signal), { kind: 'connection' });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  mock.mock.mockImplementation(async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const rejected = assert.rejects(loadDashboard('https://example.invalid/api', 'token', new AbortController().signal), { kind: 'timeout' });
  t.mock.timers.tick(15000); await rejected;
});
