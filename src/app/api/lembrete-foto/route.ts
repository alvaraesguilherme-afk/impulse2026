import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInicioEvento } from "@/lib/evento";
import { diaMural } from "@/lib/datas";
import { enviarParaInscricoes } from "@/lib/push";

// Lembrete de foto no Feed pra quem ainda não postou hoje. Chamado por um
// agendador (cron) com o CRON_SECRET; fora dos dias do Feed não faz nada.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }
  const dia = diaMural(await getInicioEvento());
  if (dia === null) return NextResponse.json({ ok: true, enviados: 0 });

  const [fotos, subs] = await Promise.all([
    prisma.mural_fotos.findMany({ where: { dia }, select: { autor: true } }),
    prisma.push_subscriptions.findMany({ where: { nome: { not: null } }, select: { nome: true } }),
  ]);
  const postaram = new Set(fotos.map((f) => f.autor).filter(Boolean));
  const faltam = [...new Set(subs.map((s) => s.nome!).filter((n) => !postaram.has(n)))];

  const enviados = await enviarParaInscricoes(
    { nome: { in: faltam } },
    { title: "📸 Que tal salvar memórias?", body: "Uma foto sua pra galera no Feed Impulse?", tipo: "lembrete_foto" },
  );
  return NextResponse.json({ ok: true, enviados, total: faltam.length });
}
