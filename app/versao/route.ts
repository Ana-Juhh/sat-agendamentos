import { NextResponse } from "next/server";

// Versão do site que está no ar (definida na compilação, ver next.config.ts).
// Fica em /versao e não em /api/versao porque, no servidor, o nginx manda
// /api/* pro PocketBase (só algumas rotas do Next são liberadas lá).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { versao: process.env.NEXT_PUBLIC_VERSAO || "" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
