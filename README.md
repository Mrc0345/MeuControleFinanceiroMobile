# MeuControleFinanceiroMobile

Aplicativo de controle financeiro pessoal desenvolvido em React Native com Expo SDK 58 e TypeScript, integrado ao backend Node.js/Express e ao banco de dados MySQL do MeuControleFinanceiroWeb.

## Objetivo e equipe

Projeto acadêmico de Wesley, Marcus, Eliezer e Davi. A aplicação mobile utiliza autenticação JWT, navegação protegida e persistência segura da sessão. A branch de Dashboard integra a base da equipe com cadastro de usuários e resumo financeiro, preservando as abas Receitas, Despesas e Movimentações.

## Pré-requisitos

- Node.js 24 LTS (24.3 ou superior, dentro da versão 24; veja `.nvmrc`) e npm.
- Git e VS Code.
- Para Android: celular com Expo Go compatível com o SDK 58. Para testar pelo QR code, mantenha o celular e o computador na mesma rede. Android Studio, JDK e compilação nativa não são necessários nesse fluxo.
- iOS exige dispositivo compatível ou macOS com simulador para execução nativa local.

## Instalação e execução

```powershell
git clone https://github.com/wesleytech015/MeuControleFinanceiroMobile.git
cd MeuControleFinanceiroMobile
npm ci
Copy-Item .env.example .env
npx expo start --go --clear
```

Edite o `.env` local antes de iniciar o aplicativo. Não copie nem envie o arquivo para o repositório.

No terminal do Expo, leia o QR code pelo Expo Go no celular conectado à mesma rede.

```powershell
npm run android
npm run ios
npm run web
npm run typecheck
npx expo install --check
npx expo-doctor
```

`android` e `ios` iniciam o servidor e tentam abrir o app; não geram um build nativo. Para conferir a compilação JavaScript Android sem emulador: `npx expo export --platform android`. Isso não substitui um teste no dispositivo.

## Configuração local

Use `.env.example` como referência e mantenha as configurações locais em `.env`, que é ignorado pelo Git.

- `EXPO_PUBLIC_API_URL`: URL pública do Express incluindo `/api`. Não inclua credenciais, tokens ou segredos. Exemplo local: `http://192.168.1.100:3000/api`.
- `EXPO_PUBLIC_AUTH_MODE`: `api` para autenticação JWT real ou `mock` para a sessão de demonstração local.

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
EXPO_PUBLIC_AUTH_MODE=api
```

O modo `mock` só é permitido em `__DEV__`. Não configure `mock` em builds de produção. Em produção, use exclusivamente `api` e uma URL HTTPS.

### Segurança de rede

Em desenvolvimento, HTTP é permitido apenas para hosts locais ou endereços privados utilizados na rede local. Em builds de produção, `EXPO_PUBLIC_API_URL` deve usar HTTPS; credenciais e JWT não devem trafegar por HTTP. As variáveis `EXPO_PUBLIC_*` são incorporadas ao bundle e não são apropriadas para armazenar segredos.

## Autenticação e sessão

A implementação separa o contrato real da API do modo de demonstração:

- `api` envia `POST /login` com `email` e `senha` ao backend. Uma resposta válida cria uma sessão com o JWT e o usuário recebido.
- `mock` aceita exclusivamente as credenciais de demonstração configuradas no código de desenvolvimento. Não faz requisições HTTP e cria uma sessão explicitamente marcada como `mock`, sem JWT falso.

A sessão é validada, serializada e persistida com `expo-secure-store`. A leitura na inicialização restaura sessões válidas, remove sessões incompatíveis com o modo atual ou com formato inválido e mantém o estado protegido em falhas nativas temporárias. Sessões com `exp` vencido são removidas localmente. O backend continua sendo a autoridade sobre a validade efetiva do JWT.

O logout remove localmente a sessão armazenada e não revoga o JWT no servidor. O backend atual não oferece refresh token nem revogação de token. Quando houver novas chamadas protegidas, o fluxo futuro deverá anexar `Authorization: Bearer <token>`; o `httpClient` atual ainda não faz essa inclusão automaticamente.

O login JWT real ainda não foi validado funcionalmente porque o banco MySQL da Aiven estava temporariamente indisponível. Os cenários do modo mock foram validados no Samsung Galaxy A54 com Expo Go SDK 58.

## Estrutura

```text
src/
  components/       # AuthGate, LogoutButton e componentes compartilhados
  config/           # configuração da API e dos modos de autenticação
  context/          # AuthContext e estados da sessão
  navigation/       # abas Início, Receitas, Despesas e Movimentações
  screens/          # telas financeiras e LoginScreen
  services/         # cliente HTTP, login e armazenamento seguro
  theme/            # cores compartilhadas
  types/            # contratos de autenticação e navegação
```

O `AuthGate` impede o acesso à navegação financeira sem uma sessão válida. O [LogoutButton](./src/components/LogoutButton.tsx) chama o logout do contexto compartilhado. `LoginScreen` permite abrir o cadastro em `RegisterScreen` no modo API; após criar a conta, retorna ao login com o e-mail preenchido.

## Dashboard e cadastro

A tela Início exibe saldo, receitas, despesas e as cinco movimentações mais recentes com `GET /api/transacoes` e o JWT real. Os totais abrangem todo o período cadastrado. No modo mock, a tela informa que é necessária uma conta real e não consulta dados financeiros. A URL passa pela mesma validação de rede da base da equipe.

O cadastro usa `POST /api/usuarios` pelo cliente HTTP compartilhado, apenas no modo API. Consulte [autenticação e cadastro](docs/autenticacao-mobile.md) e [Dashboard](docs/dashboard-mobile.md). Execute `npm test` e `npm run typecheck` antes do PR. Sessões da implementação local anterior não são migradas; entre novamente após atualizar.

## Git Flow e colaboração

`main` representa produção e `develop` integração/homologação. Ambas são protegidas; trabalhe em branches próprias e nunca faça commit diretamente nelas.

Antes de cada tarefa, com o diretório de trabalho limpo:

```powershell
git switch develop
git pull --ff-only origin develop
git switch -c feature/nome-da-tarefa
```

Cada integrante deve manter sua própria branch e combinar a responsabilidade pelas telas para reduzir conflitos. Instale dependências com `npm ci`; para dependências nativas, prefira `npx expo install nome-do-pacote` e versione `package-lock.json` junto com `package.json`.

Valide a alteração, faça commits na feature e publique com `git push -u origin feature/nome-da-tarefa`. Abra um Pull Request com destino **develop** e solicite revisão de outro integrante. Promoções para `main` devem passar pelo fluxo de revisão da equipe. Não use force push nas branches compartilhadas.

Não versione `.env`, credenciais, bancos locais, `node_modules`, `.expo` ou builds.

## Validação manual antes do PR

- Confirmar a abertura do aplicativo no Expo Go SDK 58.
- No modo `mock`, testar credenciais válidas e inválidas, acesso às quatro abas, persistência após reiniciar, logout e bloqueio após sair.
- No modo `api`, assim que o banco estiver disponível, confirmar login válido e inválido, restauração de sessão e navegação protegida.
- Verificar em dispositivo Android se os textos e a barra inferior permanecem visíveis, inclusive com fonte ampliada.
- Registrar no PR o dispositivo e a versão do sistema usados. A exportação do bundle não comprova o funcionamento nativo.

Referências: [Expo e TypeScript](https://docs.expo.dev/guides/typescript/) e [instalação do React Navigation](https://reactnavigation.org/docs/getting-started/).

## Compatibilidade com Expo Go

Execute `npx expo start --go --clear`: `--go` seleciona o Expo Go e `--clear` limpa o cache do Metro. Valide as quatro abas e o fluxo de autenticação no aparelho; as verificações automáticas não substituem esse teste.

Antes de iniciar, confirme `node -v` na versão 24 LTS. Se utilizar um Node portátil, execute o CLI do npm/npx explicitamente com esse executável para evitar que o launcher do Windows utilize o Node global.

O projeto está em Expo SDK 58 e não requer `expo-dev-client` nem pastas nativas geradas.

## Pendências conhecidas da base

- O login JWT real ainda não foi validado funcionalmente devido à indisponibilidade temporária do MySQL da Aiven.
- O backend não possui refresh token nem revogação de JWT.
- O logout é local e não invalida um token no servidor.
- O `httpClient` atual não adiciona `Authorization: Bearer` automaticamente às requisições protegidas.
- Na preparação inicial, `npm audit` reportou 15 alertas altos na cadeia Expo/Metro. Acompanhar as atualizações do ecossistema e reavaliar antes de publicar uma versão de produção. Não executar `npm audit fix --force` sem avaliar a compatibilidade.
