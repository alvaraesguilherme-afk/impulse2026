import { redirect } from "next/navigation";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { acessaCompras } from "@/lib/permissoes";
import { ListaCompras } from "@/components/telas/compras";

export default async function ComprasPage() {
  const sessao = await getSessao();
  if (!acessaCompras(sessao)) redirect("/");
  const itens = await prisma.lista_compras.findMany({ orderBy: { created_at: "desc" } });
  return (
    <ListaCompras
      sessao={sessao}
      itens={itens.map((i) => ({
        id: Number(i.id), item: i.item, categoria: i.categoria, comprado: i.comprado, lista_id: i.lista_id,
        quantidade_num: i.quantidade_num === null ? null : Number(i.quantidade_num),
        quantidade_unidade: i.quantidade_unidade, created_at: i.created_at.toISOString(),
      }))}
    />
  );
}
