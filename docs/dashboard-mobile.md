# Dashboard financeiro mobile

A tela Início consulta `GET /api/transacoes` usando o JWT da sessão atual no cabeçalho `Authorization: Bearer <token>`. O contrato foi conferido em `backend/controllers/transacaoController.js` e `backend/routes/transacoesRoutes.js` da cópia local do MeuControleFinanceiroWeb.

O backend identifica o usuário pelo token, filtra suas movimentações e devolve `saldo`, `receitas`, `despesas` e `transacoes`. Os três totais representam todo o período cadastrado, sem filtro mensal. O aplicativo usa os totais do servidor e mostra as cinco movimentações mais recentes por data, com desempate pelo id.

## Organização técnica

- `src/services/dashboardService.ts`: contrato, validação da resposta, conversão de valores DECIMAL do MySQL, formatação e consulta autenticada com timeout de 15 segundos.
- `src/screens/HomeScreen.tsx`: apresentação dos cartões, carregamento, erro, conta vazia e atualização ao retornar à aba ou puxar a tela para baixo.
- `tests/dashboard.test.cjs`: testes do contrato e de requisições com HTTP simulado; não acessam o banco.

A resposta é validada em execução porque tipos TypeScript não validam JSON recebido pela rede. Valores ausentes ou inválidos causam erro em vez de aparecerem como zero. Datas são tratadas como datas de calendário, evitando que uma movimentação à meia-noite UTC apareça no dia anterior no Brasil.

Ao perder o foco, atualizar ou desmontar a tela, a requisição anterior é cancelada com AbortController. A tela ignora resultados de requisições canceladas. Cada nova consulta limpa os totais anteriores para não apresentar informações antigas como atuais. Uma resposta HTTP 401 mostra uma orientação para sair e entrar novamente; a sessão não é removida automaticamente.

## Validação manual necessária

1. Configurar EXPO_PUBLIC_API_URL com o endereço do Express incluindo /api e reiniciar o Expo.
2. Entrar com uma conta real e conferir os três totais com os registros dessa conta.
3. Conferir os cinco registros mais recentes e as datas exibidas.
4. Testar uma conta sem movimentações e uma com saldo negativo.
5. Retornar à aba Início e puxar para atualizar.
6. Interromper o backend e conferir erro e tentativa novamente.
7. Usar uma sessão expirada e conferir a mensagem de autenticação.
8. Conferir no Android com fonte ampliada, incluindo valores longos.

## Limites desta etapa

Esta implementação usa o AuthContext compartilhado de origin/develop e Expo SDK 58. O Dashboard só consulta o backend com uma sessão real; no modo mock, mostra uma orientação para entrar no modo API, sem inventar valores financeiros. A URL é validada por src/config/api.ts, incluindo HTTPS obrigatório em produção. A verificação do contrato local não comprova a disponibilidade de um backend em execução. Não foram adicionadas operações de cadastro ou edição de movimentações.
