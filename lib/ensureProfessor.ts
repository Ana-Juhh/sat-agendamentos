import { pb } from './pocketbase'

export async function ensureProfessor() {
  const user = pb.authStore.model
  if (!user) return

  const existe = await pb.collection('professores').getFullList({
    filter: `user = "${user.id}"`
  })

  if (existe.length === 0) {
    await pb.collection('professores').create({
      user: user.id,
      nome: user.name || 'Professor',
      email: user.email
    })
  }
}
