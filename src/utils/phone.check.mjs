// Rodar: node src/utils/phone.check.mjs
import assert from "node:assert/strict";
import { phoneKey } from "./phone.ts";

for (const n of ["(34) 99999-8888", "5534999998888", "553499998888", "3499998888", "+55 34 9 9999-8888"]) {
  assert.equal(phoneKey(n), "3499998888", n);
}
assert.equal(phoneKey("(34) 3236-9899"), "3432369899");
assert.equal(phoneKey(""), "");
console.log("phoneKey ok");
