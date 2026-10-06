import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Apaga o cookie de sessão e volta pro login. Usado quando o getSessao() acha
// a sessão inválida (página não pode mexer em cookie) e pelo botão Sair.
export async function GET(req: NextRequest) {
  const motivo = req.nextUrl.searchParams.get("motivo");
  const sessao = await decrypt(req.cookies.get("escola_sessao")?.value);

  // Sair de verdade libera a vaga deste aparelho no limite de aparelhos
  if (sessao && motivo !== "encerrada") {
    await prisma.sessoes_ativas
      .delete({ where: { nome_device_id: { nome: sessao.nome, device_id: sessao.deviceId } } })
      .catch(() => null);
  }

  const destino = new URL("/login", req.nextUrl);
  if (motivo) destino.searchParams.set("motivo", motivo);
  const res = NextResponse.redirect(destino);
  res.cookies.delete("escola_sessao");
  return res;
}
