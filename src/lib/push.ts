import "server-only";
import { after } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { AREAS_COMPRAS } from "@/lib/areas";

export const VAPID_PUBLIC_KEY = "BEkiqeRZsYy3A2GTOG7MH5Tk3nFABcSPz-szF5k6ctdYFhoS70H1buhkXhH1XSseYtZT8HWR5j9Xtn5K4peyysI";

const configurado = !!process.env.VAPID_PRIVATE_KEY;
if (configurado) {
  webpush.setVapidDetails("mailto:contato.bellabarrosss@gmail.com", VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY!);
}

type Payload = { title: string; body: string; tipo: string };
type Alvo = { nomes?: string[]; equipeId?: string };

type Filtro = { equipe_id?: string; nome?: { in: string[] } };

// Manda pra todas as inscrições do filtro; inscrição morta (404/410) é apagada.
export async function enviarParaInscricoes(where: Filtro, payload: Payload) {
  if (!configurado) return 0;
  if (where.nome && where.nome.in.length === 0) return 0;
  const subs = await prisma.push_subscriptions.findMany({ where });
  const json = JSON.stringify({ ...payload, url: "/" });
  const resultados = await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, json);
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) await prisma.push_subscriptions.delete({ where: { id: s.id } }).catch(() => null);
        throw err;
      }
    }),
  );
  return resultados.filter((r) => r.status === "fulfilled").length;
}

// Envia depois da resposta (after): quem salvou não espera os pushes saírem.
// Sem VAPID_PRIVATE_KEY (ex.: rodando local) não faz nada.
function enviar(alvo: Alvo, payload: Payload) {
  if (!configurado) return;
  const where: Filtro = alvo.equipeId ? { equipe_id: alvo.equipeId } : alvo.nomes ? { nome: { in: alvo.nomes } } : {};
  after(() => enviarParaInscricoes(where, payload));
}

const corta = (s: string) => s.slice(0, 120);

export function notificarAviso(texto: string) {
  enviar({}, { title: "📢 Novo aviso do supervisor", body: corta(texto), tipo: "aviso" });
}

export function notificarFrase(frase: string) {
  enviar({}, { title: "✨ Frase do dia atualizada", body: corta(frase), tipo: "frase" });
}

export function notificarProgramacao(titulo: string) {
  enviar({}, { title: "📅 Programação atualizada", body: corta(titulo), tipo: "programacao" });
}

export function notificarEquipe(equipeId: string, autor: string, texto: string) {
  enviar({ equipeId }, { title: "💬 Mensagem da sua equipe", body: corta(`${autor}: ${texto}`), tipo: "equipe" });
}

export async function notificarListaCompras() {
  if (!configurado) return;
  const staff = await prisma.staff.findMany({ select: { nome: true, nivel: true, areas_aprovadas: true } });
  const nomes = staff
    .filter((s) => s.nivel === "maximo" || s.areas_aprovadas.some((a) => AREAS_COMPRAS.includes(a)))
    .map((s) => s.nome);
  enviar({ nomes }, { title: "🛒 Nova lista de compras", body: "Uma nova lista de compras foi criada.", tipo: "lista_compras" });
}

// Quem aprova cadastro: nivel maximo/alto (aba Equipes do Supervisor)
export async function notificarCadastroArea() {
  if (!configurado) return;
  const staff = await prisma.staff.findMany({ where: { nivel: { in: ["maximo", "alto"] } }, select: { nome: true } });
  enviar(
    { nomes: staff.map((s) => s.nome) },
    { title: "📝 Novo cadastro aguardando aprovação", body: "Um novo cadastro foi feito e está aguardando aprovação de acesso.", tipo: "cadastro_area" },
  );
}
