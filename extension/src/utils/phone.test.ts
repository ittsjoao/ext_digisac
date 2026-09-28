import { test } from "node:test";
import { strict as assert } from "node:assert";
import { phoneKey } from "./phone.ts";

test("formatos de celular viram a mesma chave", () => {
  for (const n of ["(34) 99999-8888", "5534999998888", "553499998888", "3499998888", "+55 34 9 9999-8888"]) {
    assert.equal(phoneKey(n), "3499998888", n);
  }
});

test("fixo mantém os dígitos", () => {
  assert.equal(phoneKey("(34) 3236-9899"), "3432369899");
});

test("vazio vira vazio", () => {
  assert.equal(phoneKey(""), "");
});
