/// <reference path="../pb_data/types.d.ts" />

// Trava server-side do agendamento individual de Chromebooks
// (collection "agendamentos_tmp"). A checagem que já existia era só no
// navegador (consulta + espera 350ms + consulta de novo antes de criar) —
// isso reduz a chance de choque, mas não fecha de verdade: duas pessoas
// enviando o formulário quase ao mesmo tempo ainda podiam passar pelas duas
// checagens antes de qualquer uma das duas reservas existir no banco, e os
// dois agendamentos eram criados. Rodando essa mesma checagem aqui, dentro
// do próprio pedido de criação, o PocketBase serializa as escritas e fecha
// essa brecha de verdade.
//
// Regra: um chromebook só está livre de novo quando a reserva que o prendia
// for marcada como "devolvido" (ou "cancelado") — não quando o horário
// original passar. Combinação de "status = ativo" + "status_entrega !=
// devolvido" já é exatamente isso, igual ao que o front-end já assumia.
onRecordCreateRequest((e) => {
  const record = e.record

  if (record.getString("status") === "ativo") {
    const turma = record.getString("turma").trim()
    if (!turma) {
      throw new BadRequestError("Selecione a turma antes de agendar.")
    }

    const chromebookIds = record.getStringSlice("chromebooks")
    const inicio = record.getFloat("inicio")
    const fim = record.getFloat("fim")
    const dataISO = record.getString("data").slice(0, 10)

    if (chromebookIds.length > 0 && dataISO && fim > inicio) {
      const proximoDia = new Date(dataISO + "T00:00:00Z")
      proximoDia.setUTCDate(proximoDia.getUTCDate() + 1)
      const dataSeguinte = proximoDia.toISOString().slice(0, 10)

      for (const chromebookId of chromebookIds) {
        const conflito = e.app.findRecordsByFilter(
          "agendamentos_tmp",
          "chromebooks.id ?= {:chromebookId} && data >= {:dataInicio} && data < {:dataFim} && " +
            "status = \"ativo\" && status_entrega != \"devolvido\" && " +
            "inicio < {:fim} && fim > {:inicio}",
          "",
          1,
          0,
          {
            chromebookId: chromebookId,
            dataInicio: dataISO,
            dataFim: dataSeguinte,
            inicio: inicio,
            fim: fim,
          }
        )

        if (conflito.length > 0) {
          throw new BadRequestError(
            "Um dos chromebooks selecionados já está reservado nesse horário. Escolha outro chromebook ou horário."
          )
        }
      }
    }
  }

  e.next()
}, "agendamentos_tmp")
