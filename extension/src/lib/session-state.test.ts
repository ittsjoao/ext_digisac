import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isBackendDown, isSessionCode, screenFor } from "./session-state.ts";
import type { SessionState } from "./messages.ts";

type ErrorExtras = { canRegister?: boolean; isAdmin?: boolean; contact?: string };
const err = (code: string, extra: ErrorExtras = {}): SessionState => ({
  status: "error",
  code,
  message: `msg ${code}`,
  ...extra,
});

test("ready e waiting", () => {
  assert.deepEqual(
    screenFor({ status: "ready", user: { id: "u", name: "A", isAdmin: false }, tenant: { name: "T", gclickEnabled: false, validUntil: null } }),
    { kind: "ready" },
  );
  assert.deepEqual(screenFor({ status: "waiting" }), { kind: "waiting" });
});

test("empresa não cadastrada: formulário só para quem pode cadastrar", () => {
  assert.deepEqual(screenFor(err("TENANT_NOT_FOUND", { canRegister: true })), { kind: "register" });
  assert.deepEqual(screenFor(err("TENANT_NOT_FOUND", { canRegister: false })), {
    kind: "message",
    title: "Empresa não cadastrada",
    text: "Peça ao administrador do DigiSac para cadastrar a empresa.",
    retry: false,
  });
});

test("pendente e licença inativa mostram o contato", () => {
  assert.deepEqual(screenFor(err("TENANT_PENDING", { contact: "suporte@x" })), {
    kind: "message",
    title: "Cadastro em análise",
    text: "O cadastro da empresa está aguardando liberação.",
    contact: "suporte@x",
    retry: false,
  });
  for (const code of ["TENANT_BLOCKED", "LICENSE_EXPIRED"]) {
    assert.deepEqual(screenFor(err(code, { contact: "c" })), {
      kind: "message",
      title: "Licença inativa",
      text: `msg ${code}`,
      contact: "c",
      retry: false,
    });
  }
});

test("credencial inválida: formulário só para admin", () => {
  assert.deepEqual(screenFor(err("CREDENTIAL_INVALID", { isAdmin: true })), { kind: "credentials" });
  assert.deepEqual(screenFor(err("CREDENTIAL_INVALID")), {
    kind: "message",
    title: "Credenciais da empresa inválidas",
    text: "Avise o administrador do DigiSac.",
    retry: false,
  });
});

test("sessão inválida, versão antiga e erro genérico", () => {
  for (const code of ["UNAUTHENTICATED", "ACCOUNT_MISMATCH", "INVALID_HOST"]) {
    assert.deepEqual(screenFor(err(code)), {
      kind: "message",
      title: "Sessão do DigiSac expirada ou inválida",
      text: "Recarregue a página do DigiSac.",
      retry: false,
    });
  }
  assert.deepEqual(screenFor(err("EXTENSION_OUTDATED")), {
    kind: "message",
    title: "Atualize a extensão",
    text: "msg EXTENSION_OUTDATED",
    retry: false,
  });
  assert.deepEqual(screenFor(err("UPSTREAM_ERROR")), {
    kind: "message",
    title: "Não foi possível carregar",
    text: "msg UPSTREAM_ERROR",
    retry: true,
  });
});

test("backend fora do ar: manutenção com o contato do build", () => {
  for (const code of ["NETWORK_ERROR", "HTTP_502", "HTTP_503", "HTTP_504"]) {
    assert.deepEqual(screenFor(err(code), "suporte@x"), {
      kind: "message",
      title: "Servidor em manutenção",
      text: "Por favor, aguarde.",
      contact: "suporte@x",
      retry: true,
    });
  }
  assert.deepEqual(screenFor(err("NETWORK_ERROR")), {
    kind: "message",
    title: "Servidor em manutenção",
    text: "Por favor, aguarde.",
    retry: true,
  });
});

test("códigos de indisponibilidade do backend", () => {
  for (const code of ["NETWORK_ERROR", "HTTP_502", "HTTP_503", "HTTP_504"]) assert.ok(isBackendDown(code), code);
  for (const code of ["UPSTREAM_ERROR", "HTTP_500", "TENANT_BLOCKED"]) assert.ok(!isBackendDown(code), code);
});

test("códigos de sessão", () => {
  for (const code of [
    "UNAUTHENTICATED", "TENANT_NOT_FOUND", "TENANT_PENDING", "TENANT_BLOCKED", "LICENSE_EXPIRED",
    "CREDENTIAL_INVALID", "EXTENSION_OUTDATED", "ACCOUNT_MISMATCH", "INVALID_HOST",
  ]) {
    assert.ok(isSessionCode(code), code);
  }
  for (const code of ["FORBIDDEN", "NO_PERMISSION_RULE", "DUPLICATE_CONTACT", "NETWORK_ERROR", "TOKEN_EXPIRED"]) {
    assert.ok(!isSessionCode(code), code);
  }
});
