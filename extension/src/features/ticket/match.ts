import { phoneKey } from "../../utils/phone.ts";

export interface MatchResult<C> {
  matched: { gclickName: string; contact: C }[];
  unmatched: { gclickName: string; numero: string }[];
}

/** Casa os telefones da empresa G-Click com os contatos DigiSac do serviço pela chave canônica. */
export function matchCompanyContacts<C extends { number: string | null }>(
  telefones: { nome: string; numero: string }[],
  contacts: C[],
): MatchResult<C> {
  const byKey = new Map<string, C>();
  for (const c of contacts) {
    const key = c.number ? phoneKey(c.number) : "";
    if (key) byKey.set(key, c);
  }
  const result: MatchResult<C> = { matched: [], unmatched: [] };
  for (const t of telefones) {
    const key = phoneKey(t.numero);
    const contact = key ? byKey.get(key) : undefined;
    if (contact) result.matched.push({ gclickName: t.nome, contact });
    else result.unmatched.push({ gclickName: t.nome, numero: t.numero });
  }
  return result;
}
