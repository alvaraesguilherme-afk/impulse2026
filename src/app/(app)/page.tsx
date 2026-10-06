import { getSessao } from "@/lib/dal";
import { getInicioEvento } from "@/lib/evento";
import { prisma } from "@/lib/prisma";
import { diaFrase, diaMural, hojeBRT, somaDiasISO } from "@/lib/datas";
import { Home } from "@/components/telas/home";

export default async function HomePage() {
  const [sessao, inicio] = await Promise.all([getSessao(), getInicioEvento()]);
  const hoje = hojeBRT();
  const dia = diaFrase(inicio, hoje);
  const diaOntem = diaMural(inicio, somaDiasISO(hoje, -1));

  const [aviso, frase, destaque] = await Promise.all([
    prisma.avisos.findFirst({ orderBy: { created_at: "desc" } }),
    prisma.frase_do_dia.findFirst({ where: { dia } }),
    diaOntem === null
      ? null
      : prisma.mural_fotos.findFirst({ where: { dia: diaOntem, curtidas: { gt: 0 } }, orderBy: { curtidas: "desc" } }),
  ]);

  return (
    <Home
      sessao={sessao}
      inicio={inicio}
      diaFrase={dia}
      aviso={aviso && { texto: aviso.texto ?? "", hora: aviso.hora ?? "", created_at: aviso.created_at.toISOString() }}
      frase={frase && { frase: frase.frase, autor: frase.autor }}
      destaque={destaque && { url: destaque.url, autor: destaque.autor, dia: destaque.dia, curtidas: destaque.curtidas ?? 0 }}
    />
  );
}
