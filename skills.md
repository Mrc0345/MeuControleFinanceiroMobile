# Rotinas do MeuControleFinanceiroMobile

Este arquivo documenta os procedimentos do projeto e complementa `AGENTS.md`. Não é uma instalação automática de skills do Codex; skills instaláveis possuem seu próprio diretório e um arquivo `SKILL.md`.

## Preparar o ambiente

Confira `package.json` e `.nvmrc`. A configuração atual usa Node 24, Expo SDK 58 e TypeScript; reavalie essas versões se os arquivos mudarem. Instale dependências com `npm.cmd ci` quando necessário. No PowerShell, os lançadores `.cmd` evitam o bloqueio dos lançadores `.ps1` sem exigir alteração da política de scripts.

Execute os comandos a partir da raiz do mobile:

```powershell
node --version
npm.cmd test
npm.cmd run typecheck
```

## Conectar a API real

1. Identifique qual backend e banco serão usados. Confirme porta, rotas e disponibilidade; não suponha que um servidor de outra sessão continua ativo.
2. Configure `EXPO_PUBLIC_AUTH_MODE=api` e `EXPO_PUBLIC_API_URL` com uma URL sem espaços internos, incluindo `/api` uma única vez. Use o IP do computador que executa o backend, não o gateway do roteador.
3. Para aparelho físico, confira se computador e celular estão na mesma rede acessível. Uma API ligada somente em `127.0.0.1` não recebe conexões do celular; configure a interface de rede no backend de desenvolvimento e reinicie-o.
4. Se o backend oferecer `/api/teste`, abra esse endereço no navegador do celular. A resposta confirma conectividade, mas não confirma login ou banco de dados.
5. Reinicie o Expo após alterar variáveis locais. Preserve HTTPS obrigatório em produção.

Não replique senhas do MySQL ou `JWT_SECRET` no mobile. O ambiente local de validação e seus scripts podem existir fora deste repositório; localize-os antes de usá-los, sem registrar caminhos pessoais como requisito da equipe.

## Alterar o Dashboard

Leia `docs/dashboard-mobile.md`, `src/services/dashboardService.ts` e `src/screens/HomeScreen.tsx`. Preserve os estados de carregamento, erro, conta vazia e atualização; cancele requisições antigas e evite apresentar dados da sessão anterior. Confira saldo negativo, valores longos, datas brasileiras e as cinco movimentações mais recentes.

Ao mudar contrato ou regra, atualize os testes relevantes de `tests/dashboard.test.cjs` e a documentação. A API é a fonte dos totais; não substitua falha de rede ou resposta inválida por dados fictícios.

## Validar autenticação e integração

Consulte `docs/autenticacao-mobile.md` e os testes em `tests`. Verifique cadastro, login válido/inválido, sessão, logout e erros de persistência quando a mudança atingir esses fluxos.

Para integração real, use uma API e um banco de teste conhecidos. Crie uma conta temporária pela API, obtenha o JWT e consulte o Dashboard com esse token. Confira conta vazia, movimentações persistidas, totais, saldo negativo, isolamento entre dois usuários e rejeição de tokens inválidos/expirados. Remova as contas e movimentações de teste ao terminar, sem modificar os dados de outros usuários. Não imprima tokens nem senhas nos logs.

`npm.cmd test` usa respostas simuladas em parte da suíte. Relate isso explicitamente; somente uma execução contra HTTP e banco reais comprova essa camada da integração.

## Testar visualmente no aparelho

Inicie o aplicativo com uma versão do Expo Go compatível com o SDK do projeto:

```powershell
npx.cmd expo start --go --clear
```

Abra pelo QR code. Teste cadastro e login em modo API com uma conta existente no banco escolhido; credenciais do mock não são cadastradas automaticamente nesse banco.

Confira navegação, Dashboard vazio e preenchido, atualização, perda/retorno de rede, persistência da sessão e logout. Observe fontes ampliadas, valores longos, teclado e textos cortados. Registre aparelho, sistema, modo de autenticação, ambiente do backend e capturas úteis. Exportar um bundle não equivale a testar no aparelho.

## Preparar uma entrega por PR

Antes de publicar, confira `git status`, branch atual, diferenças e resultados dos testes pertinentes. Não inclua `.env.local` nem artefatos locais. Se houver mudanças remotas concorrentes ou conflitos, inspecione-os antes de tentar integrar e não use force push.

Quando autorizado e validado, envie a feature e abra PR com `base: develop` e `compare: feature da tarefa`. Descreva o comportamento entregue, os testes realizados e as limitações. Solicite revisão de outro integrante e cumpra os checks e proteções antes do merge. Diferencie no relato final: commit local, push, PR aberto e merge concluído.

## Segurança e dependências

Consulte [docs/seguranca.md](docs/seguranca.md) ao alterar autenticação, integração ou dependências. Atualize esse guia quando regras e validações mudarem, distinguindo correções locais do backend das já integradas pela equipe.
