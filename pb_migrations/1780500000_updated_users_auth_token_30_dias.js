/// <reference path="../pb_data/types.d.ts" />

// Login dura 30 dias (antes 7). Junto com a renovação automática feita pelo
// site (components/RenovarLogin.tsx), quem usa o sistema não precisa entrar de
// novo; só quem ficar 30 dias sem abrir.
migrate((app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_")
  users.authToken.duration = 30 * 24 * 60 * 60
  return app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_")
  users.authToken.duration = 7 * 24 * 60 * 60
  return app.save(users)
})
