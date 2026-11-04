# Orientações para agentes — MeuControleFinanceiroMobile

## Escopo e fontes

Estas instruções se aplicam a este repositório. Leia `README.md`, `package.json` e os documentos da funcionalidade antes de alterar seu comportamento. Consulte `skills.md` para os procedimentos de desenvolvimento e validação. Verifique o código atual: resultados de testes, versões, endereços e permissões de sessões anteriores podem ter mudado.

O aplicativo usa React Native, Expo e TypeScript. O backend JavaScript/Express e o MySQL pertencem ao projeto separado MeuControleFinanceiroWeb. Não procure um `server.js` dentro do mobile nem trate ajustes locais do backend como alterações já publicadas pela equipe.

## Estrutura e implementação

- `src/screens`: telas; `src/components`: componentes reutilizáveis; `src/navigation`: navegação.
- `src/context/AuthContext.tsx`: sessão compartilhada; preserve sua integração com a navegação protegida.
- `src/config`: validação de endereço e modo de autenticação.
- `src/services`: comunicação HTTP, autenticação, armazenamento e contrato do Dashboard.
- `src/types` e `src/theme`: contratos e apresentação compartilhados.
- `tests`: testes Node dos módulos; `docs`: contratos e procedimentos da funcionalidade.

Mantenha TypeScript estrito e valide os dados recebidos da API em execução. Prefira os componentes, serviços e estilos existentes. Preserve as telas e os contratos dos outros integrantes; mantenha mudanças no escopo solicitado. Não adicione dependências ou atualize o Expo para resolver problemas sem relação com a tarefa. Se uma dependência mudar, mantenha `package.json` e `package-lock.json` consistentes.

## Autenticação e dados financeiros

Mantenha explícita a separação entre `api` e `mock`. O mock é exclusivo do desenvolvimento e não comprova cadastro, login JWT ou persistência no banco. Não transforme credenciais pessoais em constantes do código nem crie tokens fictícios para contornar a autenticação.

O modo API deve usar a sessão real e o JWT do backend. Preserve a persistência segura e a validação da sessão. O Dashboard precisa de uma sessão real; em mock, apresente a orientação correspondente, sem inventar valores.

O Dashboard consulta `/transacoes` a partir da URL base que já contém `/api`, com Bearer JWT. Preserve a validação dos totais, valores DECIMAL, datas de calendário e movimentações; não converta respostas inválidas silenciosamente em zero. Os totais atuais abrangem todo o período e as movimentações recentes são limitadas a cinco. Consulte `docs/dashboard-mobile.md` antes de alterar esse contrato.

## Configuração e segredos

Use `.env.example` como modelo. Endereços reais ficam em `.env` ou `.env.local`, ignorados pelo Git. `EXPO_PUBLIC_*` é incorporado ao aplicativo e não deve conter senhas, tokens ou segredos do servidor.

Preserve a validação central da URL: HTTPS em produção; HTTP local somente em desenvolvimento. Não fixe um IP pessoal no código. No aparelho físico, localhost aponta para o próprio aparelho. Computador via Ethernet e celular via Wi-Fi podem se comunicar se estiverem na mesma rede acessível.

Não versione credenciais, logs contendo dados pessoais, bancos, `node_modules`, `.expo` ou builds. Testes reais devem usar contas temporárias em ambiente identificado e remover somente os dados criados pelo teste.

## Verificação e comunicação

Para alterações de lógica, autenticação ou integração, execute `npm.cmd test` e `npm.cmd run typecheck` no Windows. Os procedimentos complementares estão em `skills.md`. Mudanças apenas de documentação exigem revisão dos caminhos, comandos e consistência; não exigem repetir testes do aplicativo sem motivo.

Distinga sempre: testes com HTTP simulado, integração com API/banco reais e teste visual no aparelho. Um não comprova os demais. Não apresente logs antigos como execução atual nem afirme sucesso no celular sem evidência. Registre comando, resultado, ambiente e limitações relevantes.

## Git e colaboração

Inspecione branch, diferenças e arquivos locais antes de editar. Preserve trabalho não relacionado; não use reset, limpeza ou force push para facilitar a tarefa. Reutilize a branch adequada quando houver trabalho em andamento.

`develop` recebe integração por Pull Request; `main` representa produção. Não envie diretamente para essas branches nem contorne proteções, checks ou revisão. Siga a revisão de outro integrante prevista no README.

Publicar, abrir PR e fazer merge depende do escopo autorizado pelo usuário. Para uma integração condicionada a testes, não publique nem integre se os testes exigidos falharem ou não puderem ser executados. Informe o impedimento e o próximo passo. Ao concluir uma tarefa de publicação, identifique branch, commits, PR e se houve merge.

## Segurança e dependências

Consulte [docs/seguranca.md](docs/seguranca.md) ao alterar autenticação, integração ou dependências. Atualize esse guia quando regras e validações mudarem, distinguindo correções locais do backend das já integradas pela equipe.
