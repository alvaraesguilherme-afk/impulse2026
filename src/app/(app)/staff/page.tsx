import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Staff } from "@/components/telas/staff";

export default async function StaffPage() {
  await getSessao();
  // Quem tem área aprovada ou é liderança (nível acima de staff) — quem ainda
  // espera aprovação não aparece. Foto, nome completo, rede e IC são escritos
  // pelo ic-coordenacao a partir do perfil de lá.
  const staff = await prisma.staff.findMany({
    where: { OR: [{ NOT: { areas_aprovadas: { isEmpty: true } } }, { nivel: { not: "staff" } }] },
    select: {
      nome: true, nivel: true, areas_aprovadas: true, equipe_atribuida: true,
      nome_completo: true, avatar_url: true, rede: true, ic: true,
    },
    orderBy: { nome: "asc" },
  });
  return (
    <Staff
      staff={staff.map((s) => ({
        nome: s.nome, nivel: s.nivel, areas: s.areas_aprovadas, equipe: s.equipe_atribuida,
        nomeCompleto: s.nome_completo, avatar: s.avatar_url, rede: s.rede, ic: s.ic,
      }))}
    />
  );
}
