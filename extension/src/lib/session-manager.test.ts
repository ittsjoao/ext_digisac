import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createSessionManager, hostFromUrl } from "./session-manager.ts";
import type { StoredSession } from "./session-manager.ts";

const HOST = "acme.digisac.co";
const SENDER = "https://acme.digisac.co/chat";
const BASE = "https://api.test";
const USER = { id: "u1", name: "Ana", isAdmin: false };
const TENANT = { name: "Acme", gclickEnabled: true, validUntil: null };
const SESSION_OK = { token: "t1", expiresAt: "2026-09-28T13:00:00Z", user: USER, tenant: TENANT };

type Handler = (body: any) => { status: number; body?: unknown } | Promise<{ status: number; body?: unknown }>;

function setup(routes: Record<string, Handler>) {
  const calls: { method: string; path: string; headers: Record<string, string>; body: any }[] = [];
  const data = new Map<string, StoredSession>();
  let clock = Date.parse("2026-09-28T12:00:00Z");
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const path = String(url).slice(BASE.length);
    calls.push({ method, path, headers, body });
    const handler = routes[`${method} ${path}`];
    if (!handler) return new Response(JSON.stringify({ code: "NOT_FOUND", message: "rota inexistente" }), { status: 404 });
    const r = await handler(body);
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status });
  }) as typeof fetch;
  const manager = createSessionManager({
    backendUrl: BASE + "/",
    version: "6.0.0",
    fetch: fetchFn,
    now: () => clock,
    store: {
      get: async (h) => data.get(h) ?? null,
      set: async (h, v) => {
        data.set(h, v);
      },
    },
  });
  return { manager, calls, data, advance: (ms: number) => (clock += ms) };
}


const authOk: Handler = () => ({ status: 200, body: SESSION_OK });

test("sem bearer a sessão fica aguardando e não chama o backend", async () => {
  const { manager, calls } = setup({});
  assert.deepEqual(await manager.handle({ type: "session:get" }, SENDER), { status: "waiting" });
  assert.equal(calls.length, 0);
});

test("session:get troca o bearer e devolve usuário e empresa sem segredos", async () => {
  const { manager, calls } = setup({ "POST /auth/session": authOk });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  const state = await manager.handle({ type: "session:get" }, SENDER);
  assert.deepEqual(state, { status: "ready", user: USER, tenant: TENANT });
  assert.deepEqual(calls[0].body, { host: HOST, sessionBearer: "sess-1" });
  assert.equal(calls[0].headers["X-Ext-Version"], "6.0.0");
  const json = JSON.stringify(state);
  assert.ok(!json.includes("sess-1") && !json.includes("t1"));
});

test("troca uma vez e reaproveita o token nas chamadas seguintes", async () => {
  const { manager, calls } = setup({
    "POST /auth/session": authOk,
    "GET /catalog": () => ({ status: 200, body: { services: [] } }),
  });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  const first = await manager.handle({ type: "api", method: "GET", path: "/catalog" }, SENDER);
  const second = await manager.handle({ type: "api", method: "GET", path: "/catalog" }, SENDER);
  assert.deepEqual(first, { ok: true, status: 200, data: { services: [] } });
  assert.deepEqual(second, first);
  assert.equal(calls.filter((c) => c.path === "/auth/session").length, 1);
  const catalog = calls.find((c) => c.path === "/catalog")!;
  assert.equal(catalog.headers.Authorization, "Bearer t1");
  assert.equal(catalog.headers["X-Ext-Version"], "6.0.0");
  assert.equal(catalog.headers["Content-Type"], undefined);
});

test("TOKEN_EXPIRED refaz a troca uma vez e repete a chamada", async () => {
  let auths = 0;
  let histories = 0;
  const { manager, calls } = setup({
    "POST /auth/session": () => ({ status: 200, body: { ...SESSION_OK, token: ++auths === 1 ? "t1" : "t2" } }),
    "GET /history": () =>
      ++histories === 1
        ? { status: 401, body: { code: "TOKEN_EXPIRED", message: "Sessão expirada." } }
        : { status: 200, body: { items: [], total: 0 } },
  });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  const r = await manager.handle({ type: "api", method: "GET", path: "/history" }, SENDER);
  assert.deepEqual(r, { ok: true, status: 200, data: { items: [], total: 0 } });
  assert.equal(auths, 2);
  const historyCalls = calls.filter((c) => c.path === "/history");
  assert.equal(historyCalls.length, 2);
  assert.equal(historyCalls[1].headers.Authorization, "Bearer t2");
});

test("token perto de vencer é renovado", async () => {
  const { manager, calls, advance } = setup({ "POST /auth/session": authOk });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  await manager.handle({ type: "session:get" }, SENDER);
  advance(30 * 60_000);
  await manager.handle({ type: "session:get" }, SENDER);
  assert.equal(calls.length, 1);
  advance(29 * 60_000 + 40_000);
  await manager.handle({ type: "session:get" }, SENDER);
  assert.equal(calls.length, 2);
});

test("bearer diferente descarta o token; o mesmo bearer não", async () => {
  const { manager, calls } = setup({ "POST /auth/session": authOk });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  await manager.handle({ type: "session:get" }, SENDER);
  await manager.handle({ type: "session:bearer", bearer: "sess-2" }, SENDER);
  await manager.handle({ type: "session:get" }, SENDER);
  await manager.handle({ type: "session:bearer", bearer: "sess-2" }, SENDER);
  await manager.handle({ type: "session:get" }, SENDER);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.sessionBearer, "sess-2");
});

test("bearer novo durante a troca não é sobrescrito pelo antigo nem fica com o token dele", async () => {
  let auths = 0;
  let env: ReturnType<typeof setup>;
  env = setup({
    "POST /auth/session": async (body) => {
      if (++auths === 1) {
        await env.manager.handle({ type: "session:bearer", bearer: "sess-2" }, SENDER);
        return { status: 200, body: { ...SESSION_OK, token: "t-old", user: { ...USER, id: "u-old" } } };
      }
      return { status: 200, body: { ...SESSION_OK, token: body.sessionBearer === "sess-2" ? "t-new" : "t-bad" } };
    },
  });
  await env.manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  const state = await env.manager.handle({ type: "session:get" }, SENDER);
  assert.deepEqual(state, { status: "ready", user: USER, tenant: TENANT });
  assert.equal(env.data.get(HOST)!.bearer, "sess-2");
  assert.equal(env.data.get(HOST)!.token, "t-new");
  assert.equal(env.calls[1].body.sessionBearer, "sess-2");
});

test("erro de sessão não apaga um bearer novo que chegou durante a chamada", async () => {
  let env: ReturnType<typeof setup>;
  env = setup({
    "POST /auth/session": authOk,
    "GET /catalog": async () => {
      await env.manager.handle({ type: "session:bearer", bearer: "sess-2" }, SENDER);
      return { status: 403, body: { code: "TENANT_BLOCKED", message: "Empresa bloqueada." } };
    },
  });
  await env.manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  await env.manager.handle({ type: "api", method: "GET", path: "/catalog" }, SENDER);
  assert.equal(env.data.get(HOST)!.bearer, "sess-2");
});

test("erro do login vira estado de erro com os detalhes conhecidos", async () => {
  const { manager } = setup({
    "POST /auth/session": () => ({
      status: 403,
      body: { code: "CREDENTIAL_INVALID", message: "Token recusado.", isAdmin: true, contact: "suporte@x", other: 1 },
    }),
  });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  assert.deepEqual(await manager.handle({ type: "session:get" }, SENDER), {
    status: "error",
    code: "CREDENTIAL_INVALID",
    message: "Token recusado.",
    isAdmin: true,
    contact: "suporte@x",
  });
});

test("canRegister false também é repassado", async () => {
  const { manager } = setup({
    "POST /auth/session": () => ({ status: 404, body: { code: "TENANT_NOT_FOUND", message: "Empresa não cadastrada.", canRegister: false } }),
  });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  assert.deepEqual(await manager.handle({ type: "session:get" }, SENDER), {
    status: "error",
    code: "TENANT_NOT_FOUND",
    message: "Empresa não cadastrada.",
    canRegister: false,
  });
});

test("erro de api devolve code, message e demais campos em details; corpo vai como JSON", async () => {
  const { manager, calls } = setup({
    "POST /auth/session": authOk,
    "POST /tickets": () => ({ status: 409, body: { code: "OPEN_TICKET_EXISTS", message: "Já existe.", extra: 1 } }),
  });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  const r = await manager.handle({ type: "api", method: "POST", path: "/tickets", body: { contactId: "c1" } }, SENDER);
  assert.deepEqual(r, { ok: false, status: 409, code: "OPEN_TICKET_EXISTS", message: "Já existe.", details: { extra: 1 } });
  const post = calls.find((c) => c.path === "/tickets")!;
  assert.equal(post.headers["Content-Type"], "application/json");
  assert.deepEqual(post.body, { contactId: "c1" });
});

test("api sem sessão devolve UNAUTHENTICATED; com licença bloqueada devolve o código do login", async () => {
  const noBearer = setup({});
  const r1 = await noBearer.manager.handle({ type: "api", method: "GET", path: "/catalog" }, SENDER);
  assert.equal((r1 as { code: string }).code, "UNAUTHENTICATED");
  assert.equal(noBearer.calls.length, 0);

  const blocked = setup({
    "POST /auth/session": () => ({ status: 403, body: { code: "TENANT_BLOCKED", message: "Empresa bloqueada.", contact: "c" } }),
  });
  await blocked.manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  const r2 = await blocked.manager.handle({ type: "api", method: "GET", path: "/catalog" }, SENDER);
  assert.deepEqual(r2, { ok: false, status: 0, code: "TENANT_BLOCKED", message: "Empresa bloqueada.", details: { contact: "c" } });
});

test("erro de sessão no meio da sessão descarta o token e o próximo session:get devolve o erro", async () => {
  let auths = 0;
  const { manager, calls } = setup({
    "POST /auth/session": () =>
      ++auths === 1
        ? { status: 200, body: SESSION_OK }
        : { status: 403, body: { code: "TENANT_BLOCKED", message: "Empresa bloqueada.", contact: "c" } },
    "GET /catalog": () => ({ status: 403, body: { code: "TENANT_BLOCKED", message: "Empresa bloqueada." } }),
  });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  const r = await manager.handle({ type: "api", method: "GET", path: "/catalog" }, SENDER);
  assert.equal((r as { code: string }).code, "TENANT_BLOCKED");
  assert.deepEqual(await manager.handle({ type: "session:get" }, SENDER), {
    status: "error",
    code: "TENANT_BLOCKED",
    message: "Empresa bloqueada.",
    contact: "c",
  });
  assert.equal(calls.filter((c) => c.path === "/auth/session").length, 2);
});

test("204 devolve data null", async () => {
  const { manager } = setup({ "POST /auth/session": authOk, "DELETE /permissions/d1": () => ({ status: 204 }) });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  assert.deepEqual(await manager.handle({ type: "api", method: "DELETE", path: "/permissions/d1" }, SENDER), {
    ok: true,
    status: 204,
    data: null,
  });
});

test("falha de rede vira NETWORK_ERROR", async () => {
  const { manager } = setup({
    "POST /auth/session": authOk,
    "GET /catalog": () => {
      throw new TypeError("Failed to fetch");
    },
  });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  const r = await manager.handle({ type: "api", method: "GET", path: "/catalog" }, SENDER);
  assert.equal((r as { code: string }).code, "NETWORK_ERROR");
});

test("cadastro e credenciais levam host e bearer, limpam o token e não devolvem segredos", async () => {
  const { manager, calls, data } = setup({
    "POST /auth/session": authOk,
    "POST /tenants": () => ({ status: 201, body: { id: "x", name: "Acme", status: "PENDENTE" } }),
    "PUT /tenants/credentials": () => ({ status: 200, body: { id: "x", name: "Acme", status: "ATIVA" } }),
  });
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  await manager.handle({ type: "session:get" }, SENDER);
  const r = await manager.handle(
    { type: "session:register", name: "Acme", digisacToken: "tok", gclick: { clientId: "c", clientSecret: "s" } },
    SENDER,
  );
  assert.equal((r as { ok: boolean }).ok, true);
  assert.deepEqual(calls.find((c) => c.path === "/tenants")!.body, {
    host: HOST,
    sessionBearer: "sess-1",
    name: "Acme",
    digisacToken: "tok",
    gclick: { clientId: "c", clientSecret: "s" },
  });
  assert.ok(!JSON.stringify(r).includes("sess-1"));
  assert.equal(data.get(HOST)!.token, null);
  assert.equal(data.get(HOST)!.bearer, "sess-1");

  await manager.handle({ type: "session:credentials", digisacToken: "novo" }, SENDER);
  assert.deepEqual(calls.find((c) => c.path === "/tenants/credentials")!.body, {
    host: HOST,
    sessionBearer: "sess-1",
    digisacToken: "novo",
  });
});

test("cadastro sem bearer não chama o backend", async () => {
  const { manager, calls } = setup({});
  const r = await manager.handle({ type: "session:register", name: "Acme", digisacToken: "tok" }, SENDER);
  assert.equal((r as { code: string }).code, "UNAUTHENTICATED");
  assert.equal(calls.length, 0);
});

test("hostFromUrl só aceita *.digisac.co", () => {
  assert.equal(hostFromUrl("https://acme.digisac.co/chat"), HOST);
  assert.equal(hostFromUrl("https://ACME.digisac.co/"), HOST);
  assert.equal(hostFromUrl("https://evil.com/"), null);
  assert.equal(hostFromUrl("https://acme.digisac.co.evil.com/"), null);
  assert.equal(hostFromUrl(undefined), null);
  assert.equal(hostFromUrl("nada"), null);
});

test("pedido fora do DigiSac ou com caminho inválido é recusado sem chamar o backend", async () => {
  const { manager, calls } = setup({ "POST /auth/session": authOk });
  const outside = await manager.handle({ type: "session:get" }, "https://evil.com/");
  assert.equal((outside as { code: string }).code, "INVALID_HOST");
  await manager.handle({ type: "session:bearer", bearer: "sess-1" }, SENDER);
  for (const path of ["//evil.com/x", "https://evil.com", "catalog"]) {
    const r = await manager.handle({ type: "api", method: "GET", path }, SENDER);
    assert.equal((r as { code: string }).code, "INVALID_PATH", path);
  }
  assert.equal(calls.length, 0);
});
