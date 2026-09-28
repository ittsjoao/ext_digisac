import { test } from "node:test";
import { strict as assert } from "node:assert";
import { groupResponsaveis } from "./responsaveis.ts";

const r = (nome: string, cargo?: string) => ({ id: 1, nome, email: `${nome}@x`, cargo: { nome: cargo } });

test("agrupa por departamento com líderes primeiro", () => {
  const out = groupResponsaveis([
    r("Leandro", "Regularização - Oper"),
    r("Michele", "Contábil - Oper"),
    r("Escarlitt", "Regularização - Líder"),
    r("Sem"),
  ]);
  assert.deepEqual(out.map((d) => d.nome), ["Contábil", "Regularização", "Sem departamento"]);
  assert.deepEqual(out[1].pessoas.map((p) => [p.nome, p.cargo]), [["Escarlitt", "Líder"], ["Leandro", "Oper"]]);
});
