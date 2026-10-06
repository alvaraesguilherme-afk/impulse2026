import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Sessao } from "@/lib/permissoes";

// Uma vez por request (React cache): confere o cookie, e no banco se o login
// ainda existe e se este aparelho não foi derrubado por outro login.
export const getSessao = cache(async (): Promise<Sessao> => {
  const cookie = (await cookies()).get("escola_sessao")?.value;
  const payload = await decrypt(cookie);
  if (!payload) redirect("/login");

  const [staff, ativa] = await Promise.all([
    prisma.staff.findUnique({
      where: { nome: payload.nome },
      select: { nome: true, nivel: true, areas_aprovadas: true, equipe_atribuida: true },
    }),
    prisma.sessoes_ativas.findUnique({
      where: { nome_device_id: { nome: payload.nome, device_id: payload.deviceId } },
      select: { nome: true },
    }),
  ]);

  // /sair apaga o cookie (página não pode) e manda pro login com o aviso
  if (!staff || !ativa) redirect("/sair?motivo=encerrada");

  return {
    nome: staff.nome,
    nivel: staff.nivel,
    areas: staff.areas_aprovadas,
    equipe: staff.equipe_atribuida,
  };
});
