import type { NextConfig } from "next";

// Versão desta compilação. Fica gravada no site e na rota /api/versao; quando
// uma aba aberta percebe que o servidor está numa versão diferente, recarrega
// (components/VerificarVersao.tsx). Assim ninguém fica usando tela antiga.
const VERSAO = process.env.SAT_VERSAO || new Date().toISOString();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSAO: VERSAO,
  },
};

export default nextConfig;
