# Rotação da TV entre SAT e GCC

A TV alterna tarefas SAT (60 s), agendamentos SAT (60 s), ativos GCC (30 s)
e chamados GCC (30 s), retornando às tarefas. Alertas do GCC pausam sua rotação.
O botão manual "Ir para tarefas" continua levando diretamente às tarefas.

As configurações da passagem ao GCC ficam em `lib/tvRotacao.ts`.
A URL inclui `tv=sat` e `voltar`, com o endereço `/dashboard/view` da origem
atual do SAT, codificado automaticamente. A navegação acontece na mesma aba.
O login do GCC continua independente, no mesmo perfil do navegador.

## Configuração e publicação

1. Publicar o GCC com suporte a `tv=sat` e ao endereço recebido em `voltar`.
2. Integrar este PR na branch `develop` e publicar o SAT.
3. No computador da TV, entrar no SAT e no GCC no mesmo perfil do navegador.
4. Abrir `/dashboard/view` no SAT e conferir um ciclo completo.
5. Conferir o ciclo tanto com o SAT local quanto com o domínio de produção.

Sem configurar `NEXT_PUBLIC_GCC_TV_URL`, o SAT usa
`https://gcc.colegiosatelite.cloud/`. Para desativar temporariamente a passagem
ao GCC, adicionar ao `.env.local`:

```dotenv
NEXT_PUBLIC_GCC_TV_URL=
```

Reiniciar `npm run dev`. Em produção, gerar uma nova compilação e publicá-la,
pois variáveis `NEXT_PUBLIC_` são incorporadas na compilação. Para reativar,
remover a configuração vazia e reiniciar/recompilar.
Uma URL inválida também mantém a rotação apenas entre tarefas e agendamentos.

Ao restaurar agendamentos pelo histórico do navegador (cache de navegação),
a página recarrega para reiniciar o contador e impedir que permaneça apagada.

## Validação

Executar `node --test tests/tv-rotacao.mjs` com Node.js 24 ou superior.
Os testes cobrem origem local/produção, configuração vazia, endereços inválidos,
parâmetros, navegação automática e restauração pelo histórico.
Executar também `npm run build` e o lint dos arquivos alterados.

A validação final em produção deve conferir o login e o retorno após o ciclo
real do GCC. Caso o navegador não consiga carregar o domínio do GCC, nenhum
código do GCC será executado; será necessário reabrir a URL do SAT.
