# Segurança e manutenção — MeuControleFinanceiroMobile

## Atualização de 03/11/2026

As dependências foram atualizadas dentro do SDK Expo 58. Foram mantidas as dependências web já adicionadas pelo integrante do projeto. A instalação resultou em Expo 58.0.23, React Native 0.88.1, safe-area-context ~5.11.1 e screens ~4.30.1, com package.json e lockfile sincronizados.

Após as atualizações: 23 testes aprovados, TypeScript aprovado, `expo install --check` aprovado e bundle Android exportado com sucesso. A exportação não substitui teste visual no aparelho. Reinicie o Expo com cache limpo antes de repetir o teste manual:

```powershell
npx.cmd expo start --go --clear
```

O npm audit caiu de dez alertas, incluindo dois altos, para cinco moderados relacionados a glob/minimatch e pacotes Expo dependentes. Nenhum alto ou crítico foi reportado nessa execução. Os cinco alertas continuam pendentes; não usar audit fix --force, cuja proposta atual rebaixa o Expo. Uma atualização futura deve preservar compatibilidade e repetir os testes.

## Contrato de segurança com o backend corrigido

- Login/cadastro reais exigem modo API; credenciais mock não cadastram contas no banco.
- GET /api/usuarios devolve somente o usuário autenticado, em array, sem hashes.
- Novo cadastro exige senha com oito caracteres no mínimo e até 72 bytes UTF-8; o servidor valida a regra.
- Tentativas malsucedidas de login/cadastro estão sujeitas a 429 e Retry-After. Exibir o erro retornado e evitar repetição automática imediata.
- Movimentações inválidas retornam 400: descrição não vazia e dentro do limite, valor positivo com até duas casas decimais e data real.
- Os endpoints e respostas do Dashboard usados pelo mobile permanecem compatíveis.

As correções de lógica do backend estão em uma cópia local do repositório MeuControleFinanceiroWeb, branch `fix/security-local-api`. Não presumir que já existem no servidor remoto: revisar e integrar o backend pelo fluxo da equipe. Sem isso, atualizar somente o mobile não corrige a exposição de dados na API antiga.

## Rotina para novas mudanças

Execute `npm.cmd test`, `npm.cmd run typecheck`, `npx.cmd expo install --check` e consulte `npm.cmd audit` ao alterar dependências. Faça integração com API/banco de teste quando o contrato mudar. Registre separadamente teste simulado, teste real e validação no aparelho.

Preserve a validação de URL em src/config/api.ts, HTTPS em produção e armazenamento seguro da sessão. Nenhum segredo do servidor ou credencial pessoal deve entrar em EXPO_PUBLIC_*, código ou logs. Valores financeiros inválidos não devem ser substituídos por mocks ou zero para ocultar erros.

Atualize este documento quando dependências, regras ou evidências mudarem; contagens de auditoria registradas aqui são o resultado daquela execução, não garantia permanente.

## Sessão na versão web

O armazenamento agora é selecionado por plataforma: `sessionStore.ts` usa expo-secure-store em Android/iOS; `sessionStore.web.ts` mantém a sessão apenas na memória da página. O SecureStore não está disponível na web e sua chamada bloqueava a abertura da tela de login.

A validação de sessão continua centralizada em sessionStorage.ts, sem contornar a autenticação. Na web, recarregar ou fechar a página exige novo login; não há persistência em localStorage, sessionStorage ou cookies. No celular, a persistência segura continua funcionando como antes. Uma sessão web persistente de produção exigiria projeto próprio de autenticação, por exemplo cookies HttpOnly com proteção CSRF.

Os testes web verificam sessão inicialmente vazia, login/armazenamento em memória, remoção, validação e isolamento de um novo contexto de página. Os testes nativos continuam usando o adaptador de SecureStore.
