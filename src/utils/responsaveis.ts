export interface Responsavel {
  id: number;
  nome: string;
  email?: string;
  cargo?: { nome?: string };
}

export interface Departamento {
  nome: string;
  pessoas: { nome: string; cargo: string; email: string }[];
}

// "Regularização - Oper" → departamento "Regularização", cargo "Oper". Líderes primeiro.
export function groupResponsaveis(list: Responsavel[]): Departamento[] {
  const map = new Map<string, Departamento["pessoas"]>();
  for (const r of list) {
    const [dept, ...rest] = (r.cargo?.nome ?? "").split(" - ");
    const nome = dept.trim() || "Sem departamento";
    if (!map.has(nome)) map.set(nome, []);
    map.get(nome)!.push({ nome: r.nome, cargo: rest.join(" - ").trim(), email: r.email ?? "" });
  }
  const rank = (cargo: string) => (/l[ií]der/i.test(cargo) ? 0 : 1);
  return [...map]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([nome, pessoas]) => ({
      nome,
      pessoas: pessoas.sort((a, b) => rank(a.cargo) - rank(b.cargo) || a.nome.localeCompare(b.nome, "pt-BR")),
    }));
}
