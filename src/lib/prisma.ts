import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Mesmo padrão do ic-coordenacao: pooler em modo transaction (DATABASE_URL,
// porta 6543) e poucas conexões por instância — num pico a Vercel sobe várias
// instâncias ao mesmo tempo e o padrão do pg (10 cada) estoura o pooler.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3 });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
