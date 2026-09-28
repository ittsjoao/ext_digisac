import { test } from "node:test";
import { strict as assert } from "node:assert";
import { matchCompanyContacts } from "./match.ts";

const contacts = [
  { id: "c1", number: "5534999998888" },
  { id: "c2", number: "553432369899" },
  { id: "c3", number: null },
  { id: "c4", number: "" },
];

test("divide os telefones da empresa entre encontrados e somente G-Click", () => {
  const r = matchCompanyContacts(
    [
      { nome: "Financeiro", numero: "(34) 99999-8888" },
      { nome: "Fixo", numero: "(34) 3236-9899" },
      { nome: "Novo", numero: "(34) 98888-7777" },
    ],
    contacts,
  );
  assert.deepEqual(r.matched.map((m) => [m.gclickName, m.contact.id]), [["Financeiro", "c1"], ["Fixo", "c2"]]);
  assert.deepEqual(r.unmatched, [{ gclickName: "Novo", numero: "(34) 98888-7777" }]);
});

test("telefone vazio nunca casa", () => {
  const r = matchCompanyContacts([{ nome: "Vazio", numero: "" }], contacts);
  assert.equal(r.matched.length, 0);
  assert.deepEqual(r.unmatched, [{ gclickName: "Vazio", numero: "" }]);
});
