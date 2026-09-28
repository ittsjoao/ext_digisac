import { test } from "node:test";
import { strict as assert } from "node:assert";
import { extractBearer } from "./bearer.ts";

test("extrai o token de requests da API do DigiSac", () => {
  assert.equal(extractBearer("Bearer abc.def", "https://acme.digisac.co/api/v1/me?include[0]=x"), "abc.def");
  assert.equal(extractBearer("bearer   abc ", "/api/v1/contacts"), "abc");
});

test("ignora outras URLs, outros esquemas e valores vazios", () => {
  assert.equal(extractBearer("Bearer abc", "https://acme.digisac.co/socket.io/"), null);
  assert.equal(extractBearer("Basic abc", "/api/v1/me"), null);
  assert.equal(extractBearer("Bearer", "/api/v1/me"), null);
  assert.equal(extractBearer(null, "/api/v1/me"), null);
  assert.equal(extractBearer(undefined, "/api/v1/me"), null);
});
