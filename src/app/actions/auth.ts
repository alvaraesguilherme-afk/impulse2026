"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, getOrCreateDeviceId } from "@/lib/session";
import { AREAS } from "@/lib/areas";
import { limiteAparelhos } from "@/lib/permissoes";
import { notificarCadastroArea } from "@/lib/push";

export type LoginState =
  | { tipo: "erro"; erro: string }
  | { tipo: "precisaArea"; nome: string }
  | { tipo: "aguardando"; nome: string; aindaPendente?: boolean }
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
  const area = String(formData.get("area") ?? "");
  const forcar = formData.get("forcar") === "1";

  if (!login.trim()) return { tipo: "erro", erro: "Digite seu login." };
  if (!pin) return { tipo: "erro", erro: "Digite sua senha." };

  const staff = await acharStaff(login);
  if (!staff) return { tipo: "erro", erro: "Login não encontrado." };
  if (staff.pin.toUpperCase() !== pin) return { tipo: "erro", erro: "Senha incorreta." };

  // Supervisor entra direto; staff comum precisa de área aprovada
  if (staff.nivel !== "staff" || staff.areas_aprovadas.length > 0) {
    return abrirSessao(staff.nome, staff.nivel, forcar);
  }
  if (staff.area_pendente) return { tipo: "aguardando", nome: staff.nome };

  if (!area) return { tipo: "precisaArea", nome: staff.nome };
  if (!(AREAS as readonly string[]).includes(area)) return { tipo: "erro", erro: "Área inválida." };

  await prisma.staff.update({ where: { nome: staff.nome }, data: { area_pendente: area } });
  await notificarCadastroArea();
  return { tipo: "aguardando", nome: staff.nome };
}

// Tela "aguardando aprovação": confere de novo (com a senha, pra ninguém
// abrir a sessão de outra pessoa só sabendo o nome).
export async function verificarAprovacao(_state: LoginState, formData: FormData): Promise<LoginState> {
  const login = String(formData.get("login") ?? "");
  const pin = String(formData.get("pin") ?? "").trim().toUpperCase();
  const forcar = formData.get("forcar") === "1";
  const staff = await acharStaff(login);
  if (!staff || staff.pin.toUpperCase() !== pin) return { tipo: "erro", erro: "Login ou senha incorretos." };
  if (staff.areas_aprovadas.length === 0 && staff.nivel === "staff") {
    return { tipo: "aguardando", nome: staff.nome, aindaPendente: true };
  }
  return abrirSessao(staff.nome, staff.nivel, forcar);
}

// Voltar antes de ser aprovado anula o pedido — some da fila do supervisor
export async function cancelarPedido(login: string, pin: string) {
  const staff = await acharStaff(login);
  if (!staff || staff.pin.toUpperCase() !== pin.trim().toUpperCase()) return;
  if (staff.areas_aprovadas.length > 0) return;
  await prisma.staff.update({ where: { nome: staff.nome }, data: { area_pendente: null } });
}
