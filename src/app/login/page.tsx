import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Entrar · Escola Impulse" };

// Nomes que ainda não entraram em nenhum aparelho — a lista que aparece ao
// tocar no campo de login. Quem já entrou some dela (mas ainda pode digitar).
async function LoginComNomes() {
  await connection();
  const [staff, sessoes] = await Promise.all([
    prisma.staff.findMany({ select: { nome: true } }),
    prisma.sessoes_ativas.findMany({ select: { nome: true }, distinct: ["nome"] }),
  ]);
  const jaEntraram = new Set(sessoes.map((s) => s.nome));
  const disponiveis = staff
    .map((s) => s.nome)
    .filter((nome) => !jaEntraram.has(nome))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  return <LoginForm nomesDisponiveis={disponiveis} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-app)" }} />}>
      <LoginComNomes />
    </Suspense>
  );
}
