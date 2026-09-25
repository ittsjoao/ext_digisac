// Rodar: node src/utils/responsaveis.check.mjs
import assert from "node:assert/strict";
import { groupResponsaveis } from "./responsaveis.ts";

const r = (nome, cargo) => ({ id: 1, nome, email: `${nome}@x`, cargo: { nome: cargo } });
const out = groupResponsaveis([
  r("Leandro", "Regularização - Oper"),
  r("Michele", "Contábil - Oper"),
  r("Escarlitt", "Regularização - Líder"),
  r("Sem", undefined),
]);
assert.deepEqual(out.map((d) => d.nome), ["Contábil", "Regularização", "Sem departamento"]);
assert.deepEqual(out[1].pessoas.map((p) => [p.nome, p.cargo]), [["Escarlitt", "Líder"], ["Leandro", "Oper"]]);
console.log("groupResponsaveis ok");
