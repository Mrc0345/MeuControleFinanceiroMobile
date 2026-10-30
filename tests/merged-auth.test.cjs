const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-typescript.cjs');

function setup(t, mode = 'api', development = true) {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousMode = process.env.EXPO_PUBLIC_AUTH_MODE;
  process.env.EXPO_PUBLIC_API_URL = 'https://example.com/api';
  process.env.EXPO_PUBLIC_AUTH_MODE = mode;
  t.after(() => {
    for (const [key, value] of [['EXPO_PUBLIC_API_URL', previousUrl], ['EXPO_PUBLIC_AUTH_MODE', previousMode]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const stored = new Map();
  const secureStore = {
    getItemAsync: async (key) => stored.get(key) ?? null,
    setItemAsync: async (key, value) => { stored.set(key, value); },
    deleteItemAsync: async (key) => { stored.delete(key); },
  };
  const load = createLoader({ development, secureStore });
  return { load, stored, secureStore, auth: load('src/services/authService.ts'), storage: load('src/services/sessionStorage.ts') };
}

const user = { id: 7, nome: 'Usuário teste', email: 'user@example.com' };

test('merged flow logs in, persists the API session, and sends its JWT to the Dashboard', async (t) => {
  const { auth, storage, load } = setup(t);
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/login')) {
      assert.deepEqual(JSON.parse(options.body), { email: user.email, senha: 'example-password' });
      return Response.json({ mensagem: 'Login realizado', token: 'example-jwt', usuario: user });
    }
    assert.equal(options.headers.Authorization, 'Bearer example-jwt');
    return Response.json({ saldo: 25, receitas: 50, despesas: 25, transacoes: [] });
  });
  const session = await auth.login({ email: user.email, senha: 'example-password' });
  assert.equal(session.source, 'api');
  assert.equal(session.version, 1);
  await storage.storeSession(session);
  const restored = await storage.getStoredSession();
  assert.deepEqual(restored, session);
  const dashboard = load('src/services/dashboardService.ts');
  assert.equal(dashboard.getDashboardAccessMessage(restored), null);
  const summary = await dashboard.loadDashboard('https://example.com/api', restored.token, new AbortController().signal);
  assert.equal(summary.saldo, 25);
  assert.deepEqual(requests.map((request) => request.url), ['https://example.com/api/login', 'https://example.com/api/transacoes']);
  await storage.clearStoredSession();
  assert.equal(await storage.getStoredSession(), null);
});

test('registration uses the shared HTTP client without creating an authenticated session', async (t) => {
  const { auth, storage } = setup(t);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://example.com/api/usuarios');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { nome: user.nome, email: user.email, senha: 'example-password' });
    return Response.json({ mensagem: 'Usuário criado', id: user.id }, { status: 201 });
  });
  await auth.register(` ${user.nome} `, ` ${user.email} `, 'example-password');
  assert.equal(await storage.getStoredSession(), null);
});

test('registration preserves server rejection and rejects malformed success', async (t) => {
  const { auth } = setup(t);
  const request = t.mock.method(globalThis, 'fetch', async () => Response.json({ erro: 'E-mail já cadastrado' }, { status: 409 }));
  await assert.rejects(auth.register(user.nome, user.email, 'password'), { status: 409, message: 'E-mail já cadastrado' });
  request.mock.mockImplementation(async () => Response.json({ ok: true }));
  await assert.rejects(auth.register(user.nome, user.email, 'password'), { kind: 'invalid_response' });
});

test('mock login stays tokenless, persists separately, and blocks registration and Dashboard access', async (t) => {
  const { auth, storage, load } = setup(t, 'mock');
  const request = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network call'); });
  const session = await auth.login({ email: 'teste@meucontrole.com', senha: '123456' });
  assert.equal(session.source, 'mock');
  assert.equal(session.token, null);
  await storage.storeSession(session);
  assert.deepEqual(await storage.getStoredSession(), session);
  assert.match(load('src/services/dashboardService.ts').getDashboardAccessMessage(session), /Modo demonstração/);
  await assert.rejects(auth.register(user.nome, user.email, 'password'), /modo API/);
  await assert.rejects(auth.login({ email: 'wrong@example.com', senha: 'wrong' }), /inválidos/);
  assert.equal(request.mock.callCount(), 0);
});

test('production rejects mock authentication', async (t) => {
  const { auth } = setup(t, 'mock', false);
  await assert.rejects(auth.login({ email: 'teste@meucontrole.com', senha: '123456' }), /produção/);
});

test('shared client allows local development HTTP and rejects public or production HTTP', async (t) => {
  const { load } = setup(t);
  const config = load('src/config/api.ts');
  process.env.EXPO_PUBLIC_API_URL = 'http://192.168.0.10:3000/api';
  assert.equal(config.getApiBaseUrl(), 'http://192.168.0.10:3000/api');
  process.env.EXPO_PUBLIC_API_URL = 'http://example.com/api';
  assert.throws(() => config.getApiBaseUrl(), /HTTPS/);
  process.env.EXPO_PUBLIC_API_URL = 'http://192.168.0.10:3000/api';
  const production = createLoader({ development: false })('src/config/api.ts');
  assert.throws(() => production.getApiBaseUrl(), /HTTPS/);
});

test('session storage rejects corrupt and legacy session formats', async (t) => {
  const { storage, stored } = setup(t);
  stored.set(storage.SESSION_STORAGE_KEY, '{broken');
  await assert.rejects(storage.getStoredSession(), { operation: 'invalid' });
  stored.set(storage.SESSION_STORAGE_KEY, JSON.stringify({ token: 'old-token', usuario: user }));
  await assert.rejects(storage.getStoredSession(), { operation: 'invalid' });
  await storage.clearStoredSession();
  assert.equal(await storage.getStoredSession(), null);
});

test('secure storage failures are reported rather than treated as a successful login', async (t) => {
  const { storage, secureStore } = setup(t);
  secureStore.setItemAsync = async () => { throw new Error('Storage unavailable'); };
  await assert.rejects(storage.storeSession({ version: 1, source: 'api', token: 'token', usuario: user }), { operation: 'save' });
});

test('secure storage rejects invalid user IDs before writing a session', async (t) => {
  const { storage, stored } = setup(t);
  for (const id of [NaN, Infinity, -Infinity, 1.5, '7', null, undefined]) {
    await assert.rejects(storage.storeSession({
      version: 1, source: 'api', token: 'example-jwt', usuario: { ...user, id },
    }), { operation: 'save' });
    assert.equal(stored.size, 0);
  }
  const session = { version: 1, source: 'api', token: 'example-jwt', usuario: user };
  await storage.storeSession(session);
  assert.deepEqual(await storage.getStoredSession(), session);
});
