import type { NextConfig } from "next";

// Versão desta compilação. Fica gravada no site e na rota /versao; quando
// uma aba aberta percebe que o servidor está numa versão diferente, recarrega
// (components/VerificarVersao.tsx). Assim ninguém fica usando tela antiga.
const VERSAO = process.env.SAT_VERSAO || new Date().toISOString();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSAO: VERSAO,
  },
  // A VPS tem pouca memória: a compilação usa 1 processador e pula a checagem
  // de tipos (que é a parte mais pesada). Por isso, rode `npx tsc --noEmit`
  // no computador antes de subir, pra não mandar erro de tipo pro servidor.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
