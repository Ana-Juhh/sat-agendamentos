import { pb } from './pocketbase'

export async function loginGoogle() {
  await pb.collection("users").authWithOAuth2({
  provider: "google",
  options: {
    redirectUrl: window.location.origin + "/auth/callback",
  },
})

  const email = pb.authStore.model?.email || ''
  if (!email.endsWith('@colegiosatelite.com.br')) {
    pb.authStore.clear()
    throw new Error('Domínio não autorizado')
  }
}
