"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ehAdmin, ehSupervisor } from "@/lib/permissoes";
import { getInicioEvento } from "@/lib/evento";
import { diaMural } from "@/lib/datas";
import { apagarFotoMural, subirFotoMural } from "@/lib/storage";

const LIMITE_BYTES = 4 * 1024 * 1024;

// Foto já comprimida no aparelho. "arquivo" é gerado lá (dia + timestamp) e
// serve de chave: reenviar da fila offline não duplica a foto. Fora dos dias
// do Feed só o nível máximo posta ("Liberar postagem").
export async function enviarFoto(formData: FormData) {
  const sessao = await getSessao();
  const foto = formData.get("foto");
  const arquivo = String(formData.get("arquivo") ?? "");
  const legenda = String(formData.get("legenda") ?? "").trim().slice(0, 200);
  if (!(foto instanceof Blob) || foto.size === 0 || foto.size > LIMITE_BYTES) throw new Error("Foto inválida");
  if (!/^dia\d+_\d+\.jpg$/.test(arquivo)) throw new Error("Nome de arquivo inválido");

  const dia = diaMural(await getInicioEvento());
  if (dia === null && !ehAdmin(sessao)) throw new Error("Feed fechado");

  const jaExiste = await prisma.mural_fotos.findFirst({ where: { arquivo }, select: { id: true } });
  if (jaExiste) return;

  const url = await subirFotoMural(arquivo, foto);
  await prisma.mural_fotos.create({ data: { dia: dia ?? 0, url, arquivo, autor: sessao.nome, legenda: legenda || null } });
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
