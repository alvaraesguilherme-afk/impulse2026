import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Pooler em modo session (porta 5432) só pra CLI (db pull); o app em runtime
    // usa DATABASE_URL (transaction, porta 6543) via adapter em src/lib/prisma.ts.
    url: process.env["DIRECT_URL"],
  },
});
