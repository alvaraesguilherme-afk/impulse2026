import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

const publicRoutes = ["/login", "/sair"];

// Só confere se o cookie de sessão é válido (assinatura). Se o login ainda
// existe no banco e se o aparelho não foi derrubado, quem confere é o
// getSessao() (src/lib/dal.ts) em cada página.
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (publicRoutes.includes(path)) return NextResponse.next();

  const session = await decrypt(req.cookies.get("escola_sessao")?.value);
  if (!session) return NextResponse.redirect(new URL("/login", req.nextUrl));

  return NextResponse.next();
}

export const config = {
  matcher: [
    // manifest e sw.js passam sem login: o Chrome busca o manifest sem cookies,
    // e redirecionado pro /login o app deixa de ser instalável.
    "/((?!api|_next/static|_next/image|manifest.webmanifest|sw.js|mosaico/|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.ico$).*)",
  ],
};
