# MeuControleFinanceiroMobile
Aplicativo de controle financeiro pessoal desenvolvido em React Native, integrado ao backend e banco de dados do MeuControleFinanceiroWeb.

## Objetivo e equipe

Projeto acadêmico de Wesley, Marcus, Eliezer e Davi. A base mobile utiliza Expo SDK 57, React Native e TypeScript. O backend Node.js/Express e MySQL da versão Web será reaproveitado futuramente; a primeira etapa de autenticação está implementada usando as rotas de login e cadastro do backend. As telas financeiras continuam como placeholders e ainda não usam dados reais.

## Pré-requisitos

- Node.js 24 LTS (24.3 ou superior, dentro da versão 24; veja `.nvmrc`) e npm.
- Git e VS Code.
- Para Android: celular com Expo Go compatível com o SDK 57. Para testar pelo QR code, mantenha o celular e o computador na mesma rede. Android Studio, JDK e compilação nativa não são necessários nesse fluxo.
- iOS exige dispositivo compatível ou macOS com simulador para execução nativa local.

## Instalação e execução

```powershell
git clone https://github.com/wesleytech015/MeuControleFinanceiroMobile.git
cd MeuControleFinanceiroMobile
git switch develop
npm ci
npx expo start --go --clear
```

Enquanto o PR da base não estiver integrado, use `git switch feature/base-mobile` após o clone.
No terminal do Expo, leia o QR code pelo Expo Go no celular conectado à mesma rede. Confirme que o Expo Go suporta SDK 57.

```powershell
npm run android
npm run ios
npm run web
npm run typecheck
npx expo install --check
npx expo-doctor
```

`android` e `ios` iniciam o servidor e tentam abrir o app; não geram um build nativo. Para conferir a compilação JavaScript Android sem emulador: `npx expo export --platform android`. Isso não substitui um teste no dispositivo.

## Estrutura

```text
src/
  components/  # componentes compartilhados
  navigation/  # abas Início, Receitas, Despesas e Movimentações
  screens/     # telas placeholder independentes
  services/    # reservado para serviços futuros
  theme/       # cores compartilhadas
  types/       # tipos de navegação
```

## Git Flow e colaboração

`main` representa produção e `develop` integração/homologação. Ambas são protegidas; trabalhe em branches próprias e nunca faça commit diretamente nelas.

Antes de cada tarefa, com o diretório de trabalho limpo:

```powershell
git switch develop
git pull --ff-only origin develop
git switch -c feature/nome-da-tarefa
```

Cada integrante deve clonar o projeto em seu ambiente, manter sua própria branch e combinar a responsabilidade pelas telas para reduzir conflitos. Instale dependências com `npm ci`; para dependências nativas, prefira `npx expo install nome-do-pacote` e versione `package-lock.json` junto com `package.json`.

Valide a alteração, faça commits na feature e publique com `git push -u origin feature/nome-da-tarefa`. Abra um Pull Request com destino **develop** e solicite revisão de outro integrante. Promoções para `main` devem passar pelo fluxo de revisão da equipe. Não use force push nas branches compartilhadas.

Não versione `.env`, credenciais, bancos locais, `node_modules`, `.expo` ou builds. Configure a URL da API em `.env.local` a partir de `.env.example`; nunca coloque chaves ou senhas em variáveis `EXPO_PUBLIC_`.

## Validação manual antes do PR

- Abrir o app e confirmar a tela Início.
- Alternar entre Receitas, Despesas e Movimentações e retornar a Início.
- Confirmar os títulos e o aviso de desenvolvimento de cada tela.
- Verificar em um dispositivo Android se os textos e a barra inferior estão visíveis, inclusive com fonte ampliada.
- Registrar no PR o dispositivo e a versão do sistema usados. A exportação do bundle não comprova o funcionamento nativo.

Referências: [Expo e TypeScript](https://docs.expo.dev/guides/typescript/) e [instalação do React Navigation](https://reactnavigation.org/docs/getting-started/).

## Compatibilidade com Expo Go

A base foi migrada do SDK 58 para o SDK 57 para corresponder ao Expo Go disponível no Samsung Galaxy A54. As quatro telas e a navegação inferior foram preservadas. Não há expo-dev-client nem pastas nativas geradas.

Execute `npx expo start --go --clear`: `--go` seleciona o Expo Go e `--clear` limpa o cache do Metro. Valide as quatro abas no aparelho; as verificações automáticas não substituem esse teste.

Antes de iniciar, confirme `node -v` na versão 24 LTS. Se utilizar um Node portátil, execute o CLI do npm/npx explicitamente com esse executável para evitar que o launcher do Windows utilize o Node global.

Em 21/10/2026, o usuário confirmou o teste físico no Samsung Galaxy A54 com Expo Go SDK 57: os seis itens do checklist passaram, incluindo a abertura do aplicativo e a navegação entre Início, Receitas, Despesas e Movimentações.

## Pendências conhecidas da base

Na preparação inicial, `npm audit` reportou 15 alertas altos na cadeia Expo/Metro, relacionados a `braces` e `node-forge`. A tentativa de correção sem `--force` manteve esses alertas; a sugestão automática restante rebaixa o Expo para uma versão incompatível com esta base. Acompanhar as atualizações do ecossistema e reavaliar antes de publicar uma versão de produção. Não executar `npm audit fix --force` sem avaliar a compatibilidade.

A instalação após a migração para SDK 57 também reportou 15 alertas altos. Essa contagem permanece como pendência de auditoria; não foi aplicada correção forçada nesta migração.

## Autenticação Mobile

Login e cadastro usam POST /api/login e POST /api/usuarios. Copie .env.example para .env.local e configure EXPO_PUBLIC_API_URL para o endereço acessível do backend. No celular, localhost aponta para o próprio aparelho; use o IPv4 do computador na mesma rede. Detalhes técnicos e conceitos para entrevistas estão em [docs/autenticacao-mobile.md](docs/autenticacao-mobile.md).

## Dashboard Mobile

A tela Início exibe saldo, receitas, despesas e as cinco movimentações mais recentes da conta autenticada, consultando GET /api/transacoes com o JWT. Inclui carregamento, conta vazia, erro e atualização ao retornar à aba ou puxar para baixo. Consulte o contrato, as decisões técnicas e o roteiro de teste em [docs/dashboard-mobile.md](docs/dashboard-mobile.md). Os totais abrangem todo o período cadastrado.
