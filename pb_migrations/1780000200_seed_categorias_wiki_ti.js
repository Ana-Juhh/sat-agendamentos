/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("categorias_conhecimento");
  const categories = [
    ["wiki001category", "Novos estagiários", "novos-estagiarios", "Onboarding, ferramentas e rotinas para quem está começando na equipe de TI.", "clipboard", 0],
    ["wiki002category", "Chromebooks", "chromebooks", "Configuração, empréstimo, manutenção e problemas comuns.", "monitor", 1],
    ["wiki003category", "Google Workspace", "google-workspace", "Contas, Drive, Gmail, Classroom e ferramentas colaborativas.", "globe", 2],
    ["wiki004category", "Google Admin", "google-admin", "Administração do ambiente Google da instituição.", "settings", 3],
    ["wiki005category", "Rede e conectividade", "rede-e-conectividade", "Internet, Wi-Fi, acessos de rede e diagnóstico.", "network", 4],
    ["wiki006category", "Impressoras", "impressoras", "Instalação, filas de impressão e solução de problemas.", "printer", 5],
    ["wiki007category", "Sistemas internos", "sistemas-internos", "Sistemas usados pelo colégio e seus procedimentos.", "settings", 6],
    ["wiki008category", "Equipamentos e carrinhos", "equipamentos-e-carrinhos", "Inventário, organização e checagens dos recursos físicos.", "monitor", 7],
    ["wiki009category", "Procedimentos e rotinas", "procedimentos-e-rotinas", "Processos recorrentes e padrões operacionais da equipe.", "folder", 8],
  ];

  for (const [id, nome, slug, descricao, icone, ordem] of categories) {
    try {
      app.findFirstRecordByFilter("categorias_conhecimento", "slug = {:slug}", { slug });
      continue;
    } catch (_) {
      // O slug ainda não existe: cria a categoria inicial.
    }

    const record = new Record(collection, { id, nome, slug, descricao, icone, ordem });
    app.save(record);
  }
}, (app) => {
  const categoryIds = [
    "wiki001category", "wiki002category", "wiki003category",
    "wiki004category", "wiki005category", "wiki006category",
    "wiki007category", "wiki008category", "wiki009category",
  ];

  for (const id of categoryIds) {
    app.delete(app.findRecordById("categorias_conhecimento", id));
  }
})
