import { NextResponse } from "next/server";

// Versão do site que está no ar (definida na compilação, ver next.config.ts).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { versao: process.env.NEXT_PUBLIC_VERSAO || "" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
