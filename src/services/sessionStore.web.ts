// SecureStore não existe na web. Mantenha o JWT apenas em memória: recarregar
// a página exige novo login, sem persistir credenciais em localStorage/cookies.
const values = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return values.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  values.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  values.delete(key);
}
