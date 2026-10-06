# Escola Impulse

App da Escola Impulse, no mesmo modelo do ic-coordenacao: Next.js 16 (App Router, `cacheComponents`),
Prisma pelo pooler do Supabase, servidor na Vercel em São Paulo (`gru1`) e banco em `sa-east-1`.

- O navegador não tem chave do banco: toda leitura é em Server Component e toda gravação é server action,
  que confere quem está logado (`src/lib/dal.ts`) e o nível (`src/lib/permissoes.ts`).
- Login = linha na tabela `staff`, criada pelo app da coordenação (nome + pin). Permissão vem de
  `staff.nivel` (`maximo` | `alto` | `basico` | `staff`) e `staff.areas_aprovadas` — nenhum nome fixo no código.
- Sem sinal, as gravações ficam guardadas no aparelho e vão quando a conexão volta (`src/lib/offline.js`;
  fotos do Feed em IndexedDB, `src/lib/fotos-offline.js`).
- As datas do evento saem de `configuracao_escola.data_inicio` (11 dias a partir dela).

## Rodar local

```
npm install
npm run dev -- -p 3001
```

`.env` (não vai pro git):

| Variável | O que é |
|---|---|
| `DATABASE_URL` | pooler transaction (porta 6543, `?pgbouncer=true`) — usada em runtime |
| `DIRECT_URL` | pooler session (porta 5432) — só pra `prisma db pull` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Storage das fotos do Feed (bucket `mural`), só no servidor |
| `SESSION_SECRET` | assina o cookie de login (`openssl rand -base64 32`) |
| `VAPID_PRIVATE_KEY` | notificações push (sem ela, push fica desligado) |
| `CRON_SECRET` | protege `/api/lembrete-foto` |

O schema do Prisma é lido do banco (`npx prisma db pull`); mudanças de estrutura são feitas no SQL Editor do Supabase.
