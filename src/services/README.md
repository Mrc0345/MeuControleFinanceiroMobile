# Integração HTTP

## Configuração

Copie `.env.example` da raiz para `.env` e ajuste `EXPO_PUBLIC_API_URL` com o IP LAN e a porta reais do Express, incluindo `/api`. Não há URL padrão. O `.env` é ignorado pelo Git. O endereço do exemplo é ilustrativo.

Celular e computador precisam estar na mesma rede, sem isolamento entre dispositivos. O backend deve estar em execução e o firewall deve permitir sua porta na rede privada. `localhost` no celular aponta para o aparelho. A conexão com o Metro não comprova acesso ao Express; o túnel do Expo também não publica a API.

Variáveis `EXPO_PUBLIC_*` são públicas e incorporadas ao aplicativo. Não coloque credenciais MySQL, JWT_SECRET ou tokens nelas. Reinicie o Expo e recarregue o aplicativo após alterar o `.env`.

## Cliente

`httpRequest<T>('/caminho', options)` retorna `{ status, data }`. Aceita método, headers, corpo JSON e `timeoutMs` (15 segundos por padrão, incluindo leitura do corpo). JSON é interpretado pelo Content-Type; texto permanece texto; corpo vazio retorna `null`. O genérico T não valida dados em runtime.

`ApiError` distingue `configuration`, `http`, `timeout`, `connection` e `invalid_response`. Erros HTTP preservam `status`, `payload` e a mensagem do campo `erro`, quando disponível. Erros de rede não têm status HTTP. Não há repetição automática, login ou persistência de tokens nesta etapa.

## Teste real no Android

1. Ative Node 24, configure o `.env` e inicie o backend separadamente.
2. Abra `http://<IP-LAN>:<PORT>/api/teste` no navegador do Android. O esperado é o texto `GET funcionando`.
3. Para testar o cliente dentro do app, adicione temporariamente ao `index.ts`, sem alterar telas:

   ```ts
   import { testApiConnection } from './src/services/apiTestService';

   if (__DEV__) {
     void testApiConnection()
       .then((response) => console.info('Teste HTTP:', response.status, response.data))
       .catch((error: unknown) => console.error('Falha no teste HTTP:', error));
   }
   ```

4. Execute `npm start`, abra no Expo Go do Android e observe o console no React Native DevTools. Sucesso real deve mostrar `200` e `GET funcionando`. Remova o trecho temporário após testar. Ele não foi adicionado nesta etapa.

O teste não usa JWT nem verifica MySQL. Não substitua falhas por respostas simuladas. Caso o ambiente Android bloqueie HTTP sem TLS, será necessário configurar o ambiente de desenvolvimento ou servir a API por HTTPS.

## Validação

Com Node 24 ativo, execute `npm run typecheck` e `npx expo install --check`. O segundo verifica compatibilidade; não use `--fix` nesta etapa.
