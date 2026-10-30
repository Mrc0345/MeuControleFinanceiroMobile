# Autenticação Mobile: implementação e conceitos

## Fluxo implementado

1. Ao abrir o app, `AuthProvider` em `src/context/AuthContext.tsx` tenta restaurar a sessão versionada do armazenamento seguro. Enquanto isso, `AuthGate` mostra um indicador de carregamento. Sessões incompatíveis com o modo atual, corrompidas ou com JWT expirado são removidas; erros de armazenamento bloqueiam o acesso e permitem tentar novamente.
2. Sem sessão, aparece `LoginScreen`. No modo API, o link Cadastre-se abre `RegisterScreen`. No modo mock, o login demonstrativo não faz requisições e não oferece cadastro.
3. No cadastro, o app valida nome, formato básico do e-mail, campos obrigatórios e confirmação de senha. Em seguida envia `{ nome, email, senha }` para `POST /api/usuarios`.
4. O backend grava senha com bcrypt e retorna sucesso ou um erro. O endpoint de cadastro atual não gera token, então o app volta ao login.
5. No login, o app envia `{ email, senha }` para `POST /api/login`. O backend compara a senha com o hash salvo e retorna um JWT de 24 horas mais o objeto do usuário.
6. O Mobile armazena a sessão com versão, origem API ou mock e dados do usuário com `expo-secure-store`. Sessões mock não têm JWT. Com uma sessão carregada, `AuthGate` libera as quatro abas. O botão Sair apaga a sessão pelo contexto compartilhado.

## Regra de negócio e limites

O backend é a autoridade para criar contas, comparar senhas, detectar e-mails duplicados e assinar o JWT. A validação no Mobile existe para dar retorno rápido ao usuário; ela pode ser contornada e, por isso, não substitui a validação do servidor. Não existe neste contrato uma regra de tamanho mínimo ou complexidade de senha, então o app não inventa uma.

O contrato do backend prevê JWT de 24 horas. Ainda não existe fluxo de refresh ou revogação no servidor. A restauração verifica a expiração localmente e o Dashboard informa quando recebe HTTP 401. O Dashboard consulta as movimentações com Bearer JWT; as telas de Receita, Despesa e Movimentações continuam provisórias.

## Arquivos e responsabilidades

- `src/screens/LoginScreen.tsx`: login da base compartilhada e acesso ao cadastro.
- `src/screens/RegisterScreen.tsx`: formulário de cadastro e retorno ao login com e-mail preenchido.
- `src/auth/validation.ts`: validações puras dos campos, sem depender da interface.
- `src/services/authService.ts`: login API ou mock e cadastro pelo cliente HTTP compartilhado.
- `src/services/sessionStorage.ts`: validação e armazenamento seguro de sessões versionadas.
- `src/context/AuthContext.tsx`: única sessão compartilhada; expõe login, logout e restauração.
- `src/components/AuthGate.tsx`: protege a navegação e apresenta carregamento e erros de restauração.
- `src/navigation/AppNavigator.tsx`: quatro abas e LogoutButton, sem um segundo provedor de autenticação.

## Configurar para testar

Use Expo Go compatível com SDK 58. Copie `.env.example` para `.env` ou `.env.local`, ajuste `EXPO_PUBLIC_API_URL` e escolha `EXPO_PUBLIC_AUTH_MODE=api` ou `mock`. No celular físico, use o IPv4 do computador na mesma rede, por exemplo `http://192.168.0.10:3000/api`; no emulador Android, use `http://10.0.2.2:3000/api`. HTTP é permitido apenas em desenvolvimento para rede local; produção exige HTTPS e modo API. Reinicie o Expo depois de mudar o arquivo. `EXPO_PUBLIC_` vai para o bundle do app: configure somente o endereço público da API, nunca senha, chave privada ou segredo JWT.

Após integrar a base da equipe, faça login novamente: a chave e o formato de armazenamento da implementação anterior são diferentes e não são migrados automaticamente. O modo mock aceita teste@meucontrole.com e senha 123456 exclusivamente em desenvolvimento; o Dashboard exige uma sessão API real.
