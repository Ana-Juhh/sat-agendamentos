# Guia rápido — planilha quinzenal de carrinhos de Chromebook

Uma página. Preencha a cada 15 dias e envie o arquivo `.csv` para a TI
importar.

## As 6 colunas (não mude o nome delas, não mude a ordem)

| Coluna | O que colocar | Exemplo |
|---|---|---|
| `Data` | a data real daquele dia de aula | `2026-08-31` |
| `Turma` | o nome exato da turma, igual à lista abaixo | `6º Ano A` |
| `Periodo_Aula` | o número da aula (1 a 6), do jeito que você já usa hoje | `3` |
| `Carrinho_ID` | `C3`, `C4` ou `C5` | `C3` |
| `Disciplina` | o nome da disciplina | `Matemática` |
| `Observacoes` | qualquer anotação (opcional) | `reposição` |

**Você não precisa digitar hora nenhuma.** O sistema calcula a hora de
início e fim sozinho a partir da turma e do número da aula.

## Turmas válidas (copie exatamente assim)

```
6º Ano A     7º Ano A     7º Ano B     8º Ano A     6º Ano B
9º Ano A     8º Ano B     9º Ano B
5º Ano A     4º Ano C     5º Ano B
```

## Carrinhos válidos

```
C3   C4   C5
```

## O que você PODE fazer

- Adicionar quantas linhas quiser, na ordem que quiser.
- Deixar `Observacoes` em branco.
- Repetir a mesma turma várias vezes no dia, em aulas (períodos) diferentes.
- Usar C3 **ou** C4 para as turmas de Fund I (5º Ano A, 4º Ano C, 5º Ano B) —
  elas realmente transitam entre os dois carrinhos, isso é normal.

## O que você NÃO PODE fazer (quebra a importação)

- Mudar o nome de uma coluna, ou a ordem das colunas.
- Escrever o nome da turma diferente da lista acima (ex.: `6A`, `6 ano A`,
  `sexto A` — nada disso vai ser reconhecido).
- Escrever `FERIADO`, `GINCANA` ou `-` em qualquer coluna. **Se não tem
  aula naquele dia, simplesmente não crie a linha.** Não precisa marcar
  nada — a ausência da linha já diz que não houve uso do carrinho.
- Digitar hora de início/fim — essa planilha não tem essas colunas de
  propósito.
- Lançar duas vezes a mesma turma, no mesmo dia, no mesmo período — o
  sistema vai rejeitar como erro de digitação.

## Antes de enviar

O sistema roda uma checagem automática e avisa se:

- alguma coluna obrigatória está faltando ou vazia;
- uma turma ou carrinho não está na lista válida;
- duas turmas diferentes reservaram o mesmo carrinho no mesmo horário (mesmo
  que sejam do Fundamental I e do Fundamental II, com número de aula
  diferente — o sistema compara o horário real, não o número da aula).

Se aparecer erro, corrija a planilha e envie de novo. Nenhum dado é
importado enquanto houver erro pendente.
