import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ehAdmin } from "@/lib/permissoes";
import { VAPID_PUBLIC_KEY } from "@/lib/push";
import { Config } from "@/components/telas/config";

export default async function ConfigPage() {
  const sessao = await getSessao();
  const relatos = ehAdmin(sessao) ? await prisma.bug_reports.findMany({ orderBy: { created_at: "desc" }, take: 200 }) : [];
  return (
    <Config
      sessao={sessao}
      vapidKey={VAPID_PUBLIC_KEY}
      relatos={relatos.map((r) => ({ id: Number(r.id), texto: r.texto, lido: r.lido, created_at: (r.created_at ?? new Date()).toISOString() }))}
    />
  );
}
