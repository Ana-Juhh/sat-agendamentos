/// <reference path="../pb_data/types.d.ts" />

onRecordCreate((e) => {
  const emprestimo = e.record
  const agendamentoId = emprestimo.get("agendamento")
  const chromebookId = emprestimo.get("chromebook")

  // 1️⃣ Buscar registros
  const agendamento = $app.findRecordById("agendamentos", agendamentoId)
  const chromebook = $app.findRecordById("chromebooks", chromebookId)

  // 2️⃣ Verificar horário
  const agora = new Date()
  const data = agendamento.get("data")
  const inicio = agendamento.get("inicio")
  const fim = agendamento.get("fim")

  const [ano, mes, dia] = data.split('-')
  const inicioDate = new Date(ano, mes - 1, dia)
  inicioDate.setMinutes(inicio - 10)
  
  const fimDate = new Date(ano, mes - 1, dia)
  fimDate.setMinutes(fim)

  if (agora < inicioDate || agora > fimDate) {
    throw new BadRequestError("Fora do horário do agendamento.")
  }

  // 3️⃣ Buscar último empréstimo
  const ultimosEmprestimos = $app.findRecordsByFilter(
    "emprestimos",
    `chromebook = {:chromebook} && agendamento = {:agendamento}`,
    "-created",
    1,
    0,
    {
      chromebook: chromebookId,
      agendamento: agendamentoId
    }
  )

  if (ultimosEmprestimos.length > 0) {
    const ultimo = ultimosEmprestimos[0]
    
    if (ultimo.get("status") === "em_uso") {
      // DEVOLUÇÃO
      ultimo.set("status", "devolvido")
      ultimo.set("saida_em", agora.toISOString())
      $app.save(ultimo)
      
      chromebook.set("status", "disponivel")
      $app.save(chromebook)
      
      throw new BadRequestError("Chromebook devolvido com sucesso!")
    }
  }

  // RETIRADA
  emprestimo.set("acao", "retirada")
  emprestimo.set("status", "em_uso")
  emprestimo.set("entrada_em", agora.toISOString())

  chromebook.set("status", "em_uso")
  $app.save(chromebook)

}, "emprestimos")

onRecordDelete((e) => {
  const chromebookId = e.record.get("chromebook")
  
  try {
    const chromebook = $app.findRecordById("chromebooks", chromebookId)
    chromebook.set("status", "disponivel")
    $app.save(chromebook)
  } catch (err) {
    console.error("Erro:", err)
  }
}, "emprestimos")