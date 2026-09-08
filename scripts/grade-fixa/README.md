# Grade Fixa — agendamento quinzenal de carrinhos de Chromebook

Migra o lançamento manual da coordenação (planilha Excel mensal, uma aba por
turma) para um CSV estruturado que este validador transforma em blocos de
horário reais (`tipo: "GRADE_FIXA"`), prontos para importar na collection
`agendamentos_espacos` do PocketBase — a mesma collection que hoje guarda os
agendamentos avulsos de carrinhos, lab e maker (ver
[`lib/espacoConfig.ts`](../../lib/espacoConfig.ts) e
[`app/agendamentos/novo/carrinhos/page.tsx`](../../app/agendamentos/novo/carrinhos/page.tsx)).

## O problema que este modelo resolve

O Fundamental I (1º–5º) e o Fundamental II (6º–9º) têm sinos diferentes: a "1ª
aula" de um segmento não começa nem termina no mesmo horário que a "1ª aula"
do outro. Como os carrinhos C3 e C4 são compartilhados entre os dois
segmentos (turmas de Fund I "transitam" entre eles), qualquer solução que
force um único conjunto de horários de período para os dois segmentos vai
gerar horários incoerentes — foi exatamente essa a tentativa anterior (5
blocos fixos 07:30–12:00 "iguais para todo mundo") que não fechou.

## Modelagem escolhida

**Tabela de sinos separada por segmento + lançamento por Turma + nº do
período.** A coordenação continua pensando e digitando exatamente como hoje
("5º Ano A, 3ª aula") — ela nunca digita hora. O sistema resolve a hora real
por *lookup*: `Turma → Segmento` (fixo, [`turmas.json`](./turmas.json)) e
`Segmento + Período → hora início/fim` (fixo,
[`grade-sinos.json`](./grade-sinos.json)). O conflito de agenda é sempre
calculado em minutos reais depois desse lookup, nunca comparando o número do
período diretamente — por isso "3ª aula" do Fund I e "3ª aula" do Fund II
podem ou não conflitar, dependendo da hora real de cada uma.

Isso corresponde à primeira opção que você levantou. Descartei as outras
duas:

- **Digitar hora início/fim direto na planilha**: mais robusto tecnicamente,
  mas transfere para a Lilian o trabalho de calcular/lembrar horários — é
  exatamente o tipo de erro de digitação que um lookup fixo elimina. Faz
  sentido como *fallback* de exceção (ver campo `Observacoes`), não como
  fluxo principal.
- **Gravar a hora calculada já na linha final antes de importar**: útil como
  *saída* do processo (é o que a flag `--json` deste script faz), mas ruim
  como *entrada* — se a Lilian digitasse a hora calculada manualmente, o
  benefício do lookup desapareceria.

**Trade-off assumido**: a tabela de sinos (`grade-sinos.json`) vira uma peça
de configuração separada, mantida por quem cuida do sistema (não pela
coordenação) e alterada raramente (só quando a escola muda o sino oficial).
Isso é deliberado — sino muda uma vez por ano ou nunca; turma/carrinho/aula
mudam a cada quinzena. Separar as duas coisas evita que uma mudança de
processo (quinzena) possa corromper acidentalmente um dado estrutural
(horário do sino).

### ⚠️ Pendência real — não finja que estes horários estão corretos

Os horários do Fundamental II (`grade-sinos.json → FUND2`) são os mesmos já
usados em produção (`HORARIOS_AULA` em `carrinhos/page.tsx`) e foram tratados
como confirmados, **exceto a 6ª aula**, que o enunciado original marcou como
incerta. Os horários do **Fundamental I são só um placeholder de exemplo**
(marcados com `"confirmado": false`) — o validador emite um **aviso** (não
bloqueia a importação) sempre que uma linha usa um horário provisório, para
isso não passar despercebido. Quando a Lilian confirmar os sinos reais do
Fund I, a única mudança necessária é editar os campos `inicio`/`fim` dentro
de `grade-sinos.json` — nenhum outro arquivo, nem o formato do CSV, muda.

## Estrutura de arquivos

| Arquivo | Papel | Quem mantém |
|---|---|---|
| `grade-sinos.json` | nº do período → hora início/fim, por segmento | dev/TI, raramente |
| `turmas.json` | turma → segmento + carrinhos permitidos | dev/TI, quando a escola cria/muda uma turma |
| `exemplo-agendamentos-quinzenal.csv` | exemplo preenchido (ver seção abaixo) | — |
| `validar-agendamentos.js` | validador + gerador do JSON de importação | dev/TI |
| A cada quinzena: um CSV novo preenchido pela Lilian | o lançamento em si | coordenação |

## CSV de lançamento quinzenal

Colunas exatas, nessa ordem, cabeçalho obrigatório:

```
Data,Turma,Periodo_Aula,Carrinho_ID,Disciplina,Observacoes
```

| Coluna | Formato | Obrigatória | Observação |
|---|---|---|---|
| `Data` | `AAAA-MM-DD` (data real do dia de aula) | sim | nunca "quinzena X", sempre a data do dia |
| `Turma` | texto exato de uma das 11 turmas cadastradas em `turmas.json` (ex.: `6º Ano A`) | sim | não abrevia, não inventa formato novo |
| `Periodo_Aula` | inteiro (`1`–`6`) | sim | número da aula, igual à planilha atual — a hora é calculada, não digitada |
| `Carrinho_ID` | `C3`, `C4` ou `C5` | sim | |
| `Disciplina` | texto livre | sim | nome da disciplina |
| `Observacoes` | texto livre | não | anotação; não é interpretada pelo importador |

Uma aula que **não acontece** (feriado, gincana, emenda) simplesmente **não
gera uma linha** nessa quinzena — não existe um valor tipo `"FERIADO"` para
digitar na coluna de disciplina; a ausência da linha já é o dado.

## Exemplo populado

[`exemplo-agendamentos-quinzenal.csv`](./exemplo-agendamentos-quinzenal.csv)
tem 13 linhas cobrindo uso normal do Fund II nos três carrinhos, Redação
quinzenal (8º ano) e Educação Física mensal (9º ano), e **dois casos reais de
conflito cruzado Fund I × Fund II no mesmo carrinho**:

- Linha 4 (`5º Ano A`, Fund I, C3, período 3 → 09:00–09:45) sobrepõe a linha 3
  (`7º Ano B`, Fund II, C3, período 2 → 08:20–09:10) em 10 minutos.
- Linha 10 (`5º Ano B`, Fund I, C4, período 3 → 09:00–09:45) sobrepõe a linha
  9 (`6º Ano B`, Fund II, C4, período 2 → 08:20–09:10) em 10 minutos.

Por isso rodar o validador nesse exemplo **termina com erro (exit code 1)
de propósito** — é o comportamento esperado, para você ver a detecção
funcionando.

Como contraste, as linhas 11 e 12 (`4º Ano C` Fund I período 1 → 07:30–08:15,
e `7º Ano A` Fund II período 2 → 08:20–09:10, ambas no C3, mesmo dia) **não**
geram conflito: sobra uma folga de 5 minutos entre uma e outra. Isso mostra
por que comparar pelo número do período seria enganoso (aqui nem são o mesmo
período, e mesmo assim alguém poderia supor que "aula logo em seguida" bate
— o que importa é sempre o minuto real, calculado via `grade-sinos.json`.

> Os horários do Fund I mudaram em 2026-08-27: só a hora de início da 1ª aula
> (07:30) foi confirmada até agora; o resto continua placeholder (ver
> `grade-sinos.json`). Se a duração real dos períodos for diferente do que
> está aqui, os exemplos acima podem precisar de novo ajuste.

## Rodando o validador

```
node validar-agendamentos.js exemplo-agendamentos-quinzenal.csv
node validar-agendamentos.js agendamentos-2026-08-31.csv --json saida.json
```

Sem `--json`: só valida, imprime erros/avisos, `exit 1` se houver erro.

Com `--json <arquivo>`: além de validar, grava um array de registros já
resolvidos (hora em minutos, turma/classe separadas, `tipo: "GRADE_FIXA"`) no
formato de campos da collection `agendamentos_espacos`. **Só grava se não
houver erro** — avisos não impedem a gravação.

O que é validado:

- Colunas obrigatórias presentes.
- `Data` no formato `AAAA-MM-DD` e é uma data real (rejeita `2026-02-30`).
- `Turma` existe em `turmas.json`.
- `Periodo_Aula` é inteiro e existe na grade de sinos do segmento da turma.
- `Carrinho_ID` é um dos valores permitidos (`C3`/`C4`/`C5`); se o carrinho
  não é um dos que a turma normalmente usa (`carrinhos_permitidos`), gera
  **aviso**, não erro — o Fund I legitimamente transita entre C3 e C4, então
  isso não pode ser bloqueado, só sinalizado para conferência.
- **Duplicidade**: a mesma `Turma` não pode aparecer duas vezes na mesma
  `Data` e `Periodo_Aula` — tratado como **erro** (decisão assumida: isso
  nunca deveria acontecer legitimamente; se acontecer, é quase sempre erro de
  digitação da coordenação, então bloqueia a importação em vez de deixar
  passar).
- **Conflito real de agenda**: mesmo `Carrinho_ID`, mesma `Data`, horários em
  minutos que se sobrepõem (`inicio_A < fim_B && fim_A > inicio_B`) entre
  turmas diferentes — incluindo entre uma turma Fund I e uma Fund II
  compartilhando C3/C4. Erro, bloqueia a importação.

## Ligação com o PocketBase — já verificado, não só lido no código

O campo `tipo` da collection `agendamentos_espacos` foi criado só com os
valores `["lab", "maker"]`
([`pb_migrations/1774381131_created_agendamentos_espacos.js`](../../pb_migrations/1774381131_created_agendamentos_espacos.js)),
mas a tela de carrinhos avulsos já grava `tipo: "carrinhos"` e usa um campo
`carrinho` que também não aparece em nenhuma migration do repositório — os
dois foram adicionados direto pelo admin do PocketBase em algum momento, sem
gerar migration. Isso foi confirmado rodando o `pocketbase.exe` local contra
`pb_data/` e lendo o schema real (`_collections`): `carrinho` é um campo
**select** (não texto livre) com os valores `["Carrinho 01".."Carrinho 05"]`,
igual ao array `CARRINHOS` do frontend.

Duas migrations resolvem isso, e ambas já foram aplicadas e testadas contra
o banco local (registro `GRADE_FIXA` real criado, consultado e apagado via
API para confirmar):

- [`1780100000_updated_agendamentos_espacos.js`](../../pb_migrations/1780100000_updated_agendamentos_espacos.js)
  soma `"carrinhos"` e `"GRADE_FIXA"` aos valores permitidos de `tipo`
  (aditivo, não remove nada).
- [`1780100100_updated_agendamentos_espacos_disciplina.js`](../../pb_migrations/1780100100_updated_agendamentos_espacos_disciplina.js)
  adiciona o campo `disciplina` (texto), que não existia — sem ele o import
  perderia essa coluna da planilha da coordenação.

O formato de saída do `--json` já usa a mesma convenção de texto da tela de
carrinhos (`"Carrinho 03"`, não um número) — ver `CARRINHO_LABEL` no início
de `validar-agendamentos.js` e em [`lib/gradeSinos.ts`](../../lib/gradeSinos.ts).

**Bug pré-existente encontrado e corrigido durante esse teste** (não
introduzido por esta mudança, mas afeta diretamente a confiabilidade da
detecção de conflito): o campo `data` é `datetime`
(`"2026-08-31 00:00:00.000Z"`), então um filtro `data = "2026-08-31"`
(igualdade exata com string sem hora) **nunca bate** — só range
(`data >= "2026-08-31" && data < "2026-09-01"`) funciona. A checagem de
conflito em `app/agendamentos/novo/carrinhos/page.tsx` usava igualdade
exata e foi corrigida para usar range. **As telas de Lab e Sala Maker
(`app/agendamentos/novo/lab/page.tsx`, `.../maker/page.tsx`) têm o mesmo
padrão quebrado e não foram alteradas** — a checagem de conflito nelas
provavelmente nunca encontra colisão de horário de verdade. Vale corrigir
lá também.

Falta ainda o script que de fato lê o `saida.json` e chama
`pb.collection('agendamentos_espacos').create(...)` para cada registro — o
`--json` só grava o arquivo localmente. Avise se quiser que eu implemente
esse passo também.
