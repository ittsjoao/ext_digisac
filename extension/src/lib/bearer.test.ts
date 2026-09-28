import { test } from "node:test";
import { strict as assert } from "node:assert";
import { extractBearer } from "./bearer.ts";

const ORIGIN = "https://acme.digisac.co";

test("extrai o token de requests da API do DigiSac", () => {
  assert.equal(extractBearer("Bearer abc.def", "https://acme.digisac.co/api/v1/me?include[0]=x", ORIGIN), "abc.def");
  assert.equal(extractBearer("bearer   abc ", "/api/v1/contacts", ORIGIN), "abc");
});

test("ignora outras URLs, outros esquemas e valores vazios", () => {
  assert.equal(extractBearer("Bearer abc", "https://acme.digisac.co/socket.io/", ORIGIN), null);
  assert.equal(extractBearer("Basic abc", "/api/v1/me", ORIGIN), null);
  assert.equal(extractBearer("Bearer", "/api/v1/me", ORIGIN), null);
  assert.equal(extractBearer(null, "/api/v1/me", ORIGIN), null);
  assert.equal(extractBearer(undefined, "/api/v1/me", ORIGIN), null);
});

test("ignora requests para outras origens, mesmo com /api/v1/ no caminho", () => {
  assert.equal(extractBearer("Bearer abc", "https://widget.example.com/api/v1/me", ORIGIN), null);
  assert.equal(extractBearer("Bearer abc", "https://outra.digisac.co/api/v1/me", ORIGIN), null);
  assert.equal(extractBearer("Bearer abc", "//evil.com/api/v1/me", ORIGIN), null);
  assert.equal(extractBearer("Bearer abc", "https://acme.digisac.co/x?next=/api/v1/me", ORIGIN), null);
});
