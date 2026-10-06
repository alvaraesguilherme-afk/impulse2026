import type { ReactNode } from "react";
import { Suspense } from "react";
import { getSessao } from "@/lib/dal";
import { ehSupervisor } from "@/lib/permissoes";
import { Sidebar, NavMobile } from "@/components/navegacao";
import { SyncOffline } from "@/components/sync-offline";

async function NavComSessao() {
  const sessao = await getSessao();
  const podeSupervisor = ehSupervisor(sessao);
  return (
    <>
      <Sidebar podeSupervisor={podeSupervisor} />
      <NavMobile podeSupervisor={podeSupervisor} />
    </>
  );
}

function Carregando() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "3px solid var(--accent-light)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <NavComSessao />
      </Suspense>
      <SyncOffline />
      <main className="conteudo-app">
        <Suspense fallback={<Carregando />}>{children}</Suspense>
      </main>
    </>
  );
}
