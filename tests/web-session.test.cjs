const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-typescript.cjs');
const session = { version: 1, source: 'api', token: 'temporary-test-token', usuario: { id: 7, nome: 'Teste', email: 'teste@example.invalid' } };

function loadWebStorage() {
  return createLoader({ platform: 'web', secureStore: new Proxy({}, { get() { throw new Error('Native SecureStore must not be used on web'); } }) })('src/services/sessionStorage.ts');
}

test('web starts unauthenticated and stores/removes a validated session without native storage', async () => {
  const storage = loadWebStorage();
  assert.equal(await storage.getStoredSession(), null);
  await storage.storeSession(session);
  assert.deepEqual(await storage.getStoredSession(), session);
  await storage.clearStoredSession();
  assert.equal(await storage.getStoredSession(), null);
});

test('web does not restore tokens after a new page/module context', async () => {
  const firstPage = loadWebStorage();
  await firstPage.storeSession(session);
  assert.equal(await loadWebStorage().getStoredSession(), null);
  assert.deepEqual(await firstPage.getStoredSession(), session);
});

test('web preserves session validation instead of bypassing the authentication gate', async () => {
  const storage = loadWebStorage();
  await assert.rejects(storage.storeSession({ ...session, token: '' }), { operation: 'save' });
  assert.equal(await storage.getStoredSession(), null);
});
