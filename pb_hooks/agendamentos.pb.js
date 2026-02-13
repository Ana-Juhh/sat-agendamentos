/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
  const carrinho = e.record.get("carrinho")
  const data = e.record.get("data")
  const inicio = e.record.get("inicio")
  const fim = e.record.get("fim")

  if (carrinho === null || !data || inicio === null || fim === null) {
    throw new BadRequestError("Dados incompletos.")
  }

  const conflitos = $app.findRecordsByFilter(
    "agendamentos",
    "carrinho = {:c} && data = {:d} && inicio < {:fim} && fim > {:inicio}",
    "",
    1,
    0,
    {
      c: carrinho,
      d: data,
      inicio: inicio,
      fim: fim
    }
  )

  if (conflitos.length > 0) {
    throw new BadRequestError(
      "Este carrinho já está reservado nesse horário."
    )
  }

  return e.next()
}, "agendamentos")
