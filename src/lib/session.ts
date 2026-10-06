import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET);

// Sem expiração curta: a sessão só acaba quando a pessoa sai ou é derrubada
// por estourar o limite de aparelhos (linha em sessoes_ativas some), igual
// ao app antigo. O cookie dura 1 ano e o JWT também.
export const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

export type SessionPayload = { nome: string; deviceId: string };

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = ""): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, encodedKey, { algorithms: ["HS256"] });
    if (typeof payload.nome !== "string" || typeof payload.deviceId !== "string") return null;
    return { nome: payload.nome, deviceId: payload.deviceId };
  } catch {
    return null;
  }
}

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createSession(payload: SessionPayload) {
  const session = await encrypt(payload);
  (await cookies()).set("escola_sessao", session, { ...cookieBase, maxAge: SESSION_DURATION_MS / 1000 });
}

export async function deleteSession() {
  (await cookies()).delete("escola_sessao");
}

// Identifica o aparelho (substitui o impulse_device_id do localStorage): é o
// que o limite de aparelhos por login usa pra saber se é o mesmo celular.
export async function getOrCreateDeviceId() {
  const store = await cookies();
  const atual = store.get("escola_aparelho")?.value;
  if (atual) return atual;
  const novo = crypto.randomUUID();
  store.set("escola_aparelho", novo, { ...cookieBase, maxAge: 5 * 365 * 24 * 60 * 60 });
  return novo;
}
