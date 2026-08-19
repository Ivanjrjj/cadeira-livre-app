import { NextRequest, NextResponse } from "next/server";

// Domínio raiz da plataforma. Em produção: "cadeiralivre.app"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

/**
 * Cada barbearia é acessada por um subdomínio:
 *   barbearia-do-jean.cadeiralivre.app  ->  reescreve internamente para /b/barbearia-do-jean
 * O resto da aplicação (páginas, API) trata "barbearia-do-jean" como o slug do tenant.
 * Um domínio próprio do cliente (ex: agendabarbeariadojean.com.br) pode ser mapeado
 * pro mesmo slug depois, numa tabela de domínios customizados — não muda a lógica abaixo.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  const currentHost = hostname.replace(`.${ROOT_DOMAIN}`, "").replace(ROOT_DOMAIN, "");

  // acessando o domínio raiz (site institucional / landing da plataforma)
  if (!currentHost || currentHost === "www" || hostname === ROOT_DOMAIN) {
    return NextResponse.next();
  }

  // qualquer outro subdomínio = slug de uma barbearia
  url.pathname = `/b/${currentHost}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
