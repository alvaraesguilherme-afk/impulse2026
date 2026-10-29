"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, getOrCreateDeviceId } from "@/lib/session";
import { limiteAparelhos } from "@/lib/permissoes";

export type LoginState =
  | { tipo: "erro"; erro: string }
  | { tipo: "bloqueado"; erro: string }
  | undefined;

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

// O login é o nome que o app da coordenação gravou (1º + 2º nome) — aceita
// sem acento, com maiúscula/minúscula diferente e espaço sobrando.
async function acharStaff(login: string) {
  const alvo = normalizar(login);
  if (!alvo) return null;
  const todos = await prisma.staff.findMany({
    select: { nome: true, pin: true, nivel: true, areas_aprovadas: true, area_pendente: true },
  });
  return todos.find((s) => normalizar(s.nome) === alvo) ?? null;
}

async function abrirSessao(nome: string, nivel: string, forcar: boolean): Promise<LoginState> {
  const deviceId = await getOrCreateDeviceId();
  const sessoes = await prisma.sessoes_ativas.findMany({ where: { nome }, select: { device_id: true } });
  const jaEsteAparelho = sessoes.some((s) => s.device_id === deviceId);
  const limite = limiteAparelhos(nivel);

  if (!jaEsteAparelho && sessoes.length >= limite) {
    if (!forcar) {
      return {
        tipo: "bloqueado",
        erro: limite >= 2
          ? "Esta conta já está ativa em 2 aparelhos."
          : "Esta conta já está ativa em outro aparelho.",
      };
    }
    // "Sou eu, entrar mesmo assim": derruba os outros aparelhos
    await prisma.sessoes_ativas.deleteMany({ where: { nome } });
  }

  await prisma.sessoes_ativas.upsert({
    where: { nome_device_id: { nome, device_id: deviceId } },
    update: { updated_at: new Date() },
    create: { nome, device_id: deviceId },
  });
  await createSession({ nome, deviceId });
  redirect("/");
}

export async function entrar(_state: LoginState, formData: FormData): Promise<LoginState> {
  const login = String(formData.get("login") ?? "");
  const pin = String(formData.get("pin") ?? "").trim().toUpperCase();
  const forcar = formData.get("forcar") === "1";

  if (!login.trim()) return { tipo: "erro", erro: "Digite seu login." };
  if (!pin) return { tipo: "erro", erro: "Digite sua senha." };

  const staff = await acharStaff(login);
  if (!staff) return { tipo: "erro", erro: "Login não encontrado." };
  if (staff.pin.toUpperCase() !== pin) return { tipo: "erro", erro: "Senha incorreta." };

  // Todo mundo entra direto; a função (área) quem dá é o supervisor, em Supervisor → Equipes.
  return abrirSessao(staff.nome, staff.nivel, forcar);
}
