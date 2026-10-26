# Autenticação Mobile: implementação e conceitos

## Fluxo implementado

1. Ao abrir o app, `AuthProvider` tenta restaurar a sessão do armazenamento seguro. Enquanto isso, a navegação mostra um indicador de carregamento.
2. Sem sessão, aparece `AuthScreen`, com alternância entre login e cadastro.
3. No cadastro, o app valida nome, formato básico do e-mail, campos obrigatórios e confirmação de senha. Em seguida envia `{ nome, email, senha }` para `POST /api/usuarios`.
4. O backend grava senha com bcrypt e retorna sucesso ou um erro. O endpoint de cadastro atual não gera token, então o app volta ao login.
5. No login, o app envia `{ email, senha }` para `POST /api/login`. O backend compara a senha com o hash salvo e retorna um JWT de 24 horas mais o objeto do usuário.
6. O Mobile armazena o JWT e os dados básicos do usuário com `expo-secure-store`. Com uma sessão carregada, mostra as quatro abas. O botão Sair apaga a sessão.

## Regra de negócio e limites

O backend é a autoridade para criar contas, comparar senhas, detectar e-mails duplicados e assinar o JWT. A validação no Mobile existe para dar retorno rápido ao usuário; ela pode ser contornada e, por isso, não substitui a validação do servidor. Não existe neste contrato uma regra de tamanho mínimo ou complexidade de senha, então o app não inventa uma.

O JWT expira depois de 24 horas. Ainda não existe fluxo de refresh nem tratamento global de token expirado; essas regras entram ao integrar as telas financeiras com as rotas protegidas. As telas de Receita, Despesa, Movimentações e o Dashboard continuam sem buscar dados com o token.

## Arquivos e responsabilidades

- `src/screens/AuthScreen.tsx`: formulários, estado visual, mensagens e envio de login/cadastro.
- `src/auth/validation.ts`: validações puras dos campos, sem depender da interface.
- `src/services/authService.ts`: chamadas HTTP e leitura/armazenamento seguro da sessão.
- `src/auth/AuthContext.tsx`: sessão compartilhada pela árvore de componentes React; expõe entrar e sair.
- `src/navigation/AppNavigator.tsx`: mostra a autenticação antes das abas.

## Configurar para testar

Copie `.env.example` para `.env.local` e ajuste `EXPO_PUBLIC_API_URL`. No celular físico, use o IPv4 do computador na mesma rede, por exemplo `http://192.168.0.10:3000/api`; no emulador Android, use `http://10.0.2.2:3000/api`. Reinicie o Expo depois de mudar o arquivo. `EXPO_PUBLIC_` vai para o bundle do app: configure somente o endereço público da API, nunca senha, chave privada ou segredo JWT.
