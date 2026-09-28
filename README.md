# ext_digisac

Extensão de navegador para abrir chamados no DigiSac com permissões por departamento e integração G-Click, atendendo várias empresas com licença mensal.

| Pasta | O que é |
|---|---|
| `extension/` | extensão WXT + React (Chrome MV3 e Firefox) |
| `backend/` | API Java 21 / Spring Boot: sessão pelo `/me` do DigiSac, licença, permissões, DigiSac e G-Click (ver `backend/README.md`) |

## Extensão

```bash
cd extension
pnpm install
pnpm test          # lógica pura
pnpm dev           # Chrome com backend em http://localhost:8080
```

Build de produção:

```bash
cp .env.example .env.production   # ajuste WXT_BACKEND_URL
pnpm build         # Chrome → .output/chrome-mv3
pnpm build:firefox # Firefox → .output/firefox-mv2
```

Carregar no Chrome: `chrome://extensions` → Modo do desenvolvedor → Carregar sem compactação → `extension/.output/chrome-mv3`.

A extensão não guarda nenhum token: o login usa a sessão do DigiSac aberta no navegador e toda chamada passa pelo backend.
