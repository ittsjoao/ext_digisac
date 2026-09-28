const DIGISAC_API = /\/api\/v1\//;

/** Token do cabeçalho Authorization de uma request da API do DigiSac; null para qualquer outra coisa. */
export function extractBearer(authorization: string | null | undefined, url: string): string | null {
  if (!authorization || !DIGISAC_API.test(url)) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  return match ? match[1] : null;
}
