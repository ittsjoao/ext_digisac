const DIGISAC_API = /^\/api\/v1\//;

/**
 * Token do cabeçalho Authorization de uma request da API do DigiSac feita para a própria página
 * (`origin` = origem da página); null para qualquer outra coisa, inclusive outras origens.
 */
export function extractBearer(authorization: string | null | undefined, url: string, origin: string): string | null {
  if (!authorization) return null;
  let target: URL;
  try {
    target = new URL(url, origin);
  } catch {
    return null;
  }
  if (target.origin !== origin || !DIGISAC_API.test(target.pathname)) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  return match ? match[1] : null;
}
