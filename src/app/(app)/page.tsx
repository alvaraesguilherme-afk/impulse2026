import { getSessao } from "@/lib/dal";
import { getInicioEvento } from "@/lib/evento";
import { prisma } from "@/lib/prisma";
import { diaFrase, hojeBRT, somaDiasISO } from "@/lib/datas";
import { Home } from "@/components/telas/home";

export default async function HomePage() {
  const [sessao, inicio] = await Promise.all([getSessao(), getInicioEvento()]);
  const hoje = hojeBRT();
  const dia = diaFrase(inicio, hoje);
  // Foto destaque: a mais curtida de ontem (dia civil em Brasília, UTC-3)
  const inicioOntem = new Date(`${somaDiasISO(hoje, -1)}T03:00:00Z`);
  const inicioHoje = new Date(`${hoje}T03:00:00Z`);

  const [frases, destaque] = await Promise.all([
    prisma.frase_do_dia.findMany({ where: { dia }, orderBy: { id: "asc" }, take: 2 }),
    prisma.mural_fotos.findFirst({ where: { created_at: { gte: inicioOntem, lt: inicioHoje }, curtidas: { gt: 0 } }, orderBy: { curtidas: "desc" } }),
  ]);

  return (
    <Home
      sessao={sessao}
      inicio={inicio}
      diaFrase={dia}
      frases={frases.map((f) => ({ id: Number(f.id), frase: f.frase, autor: f.autor }))}
      destaque={destaque && { url: destaque.url, autor: destaque.autor, curtidas: destaque.curtidas ?? 0 }}
    />
  );
}
