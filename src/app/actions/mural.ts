"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ehAdmin, ehSupervisor } from "@/lib/permissoes";
import { getMuralAberto } from "@/lib/evento";
import { apagarFotoMural, subirFotoMural } from "@/lib/storage";

const LIMITE_BYTES = 4 * 1024 * 1024;

// Foto já comprimida no aparelho. "arquivo" é gerado lá (dia + timestamp) e
// serve de chave: reenviar da fila offline não duplica a foto.
export async function enviarFoto(formData: FormData) {
  const sessao = await getSessao();
  const foto = formData.get("foto");
  const arquivo = String(formData.get("arquivo") ?? "");
  const legenda = String(formData.get("legenda") ?? "").trim().slice(0, 200);
  if (!(foto instanceof Blob) || foto.size === 0 || foto.size > LIMITE_BYTES) throw new Error("Foto inválida");
  if (!/^dia\d+_\d+\.jpg$/.test(arquivo)) throw new Error("Nome de arquivo inválido");

  if (!(await getMuralAberto()) && !ehAdmin(sessao)) throw new Error("Postagens travadas");

  const jaExiste = await prisma.mural_fotos.findFirst({ where: { arquivo }, select: { id: true } });
  if (jaExiste) return;

  const url = await subirFotoMural(arquivo, foto);
  await prisma.mural_fotos.create({ data: { dia: 0, url, arquivo, autor: sessao.nome, legenda: legenda || null } });
  revalidatePath("/mural");
}

export async function deletarFoto(id: number) {
  const sessao = await getSessao();
  const foto = await prisma.mural_fotos.findUnique({ where: { id: BigInt(id) }, select: { autor: true, arquivo: true } });
  if (!foto) return;
  if (foto.autor !== sessao.nome && !ehSupervisor(sessao)) throw new Error("Sem permissão");
  await prisma.mural_fotos.delete({ where: { id: BigInt(id) } });
  await apagarFotoMural(foto.arquivo);
  revalidatePath("/mural");
}

// Incremento atômico: duas pessoas curtindo juntas não se sobrescrevem
export async function curtirFoto(id: number, delta: 1 | -1) {
  await getSessao();
  if (delta !== 1 && delta !== -1) return;
  await prisma.mural_fotos.updateMany({ where: { id: BigInt(id) }, data: { curtidas: { increment: delta } } });
  if (delta === -1) await prisma.mural_fotos.updateMany({ where: { id: BigInt(id), curtidas: { lt: 0 } }, data: { curtidas: 0 } });
}

// Só o nível máximo libera/trava as postagens do Feed (botão no próprio Feed).
export async function definirMuralAberto(aberto: boolean) {
  const sessao = await getSessao();
  if (!ehAdmin(sessao)) throw new Error("Sem permissão");
  await prisma.configuracao_escola.update({ where: { id: 1 }, data: { mural_aberto: aberto } });
  revalidatePath("/mural");
}
