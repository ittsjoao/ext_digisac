# AGENTS.md — ext_digisac

## Documentação

A documentação do projeto vive na **wiki local**, não no Outline:

- Pasta: `C:\Users\joao.silva\Documents\wiki\pessoal-wiki` (repo `ittsjoao/pessoal-wiki`)
- Páginas deste projeto: `projetos/conhecimento/ext_digisac - *.md`
  (comece por `ext_digisac - visão geral e regras.md`: o que é, como funciona e as regras)
- Antes de escrever, leia o `AGENTS.md` da wiki (frontmatter, `python gerar_indices.py`,
  commit `wiki(<dominio>): …`, sem tokens nem caminhos locais nas páginas).

## Git

Commits e push direto na `main` (sem branch de feature).
Nunca versionar: `*.har` (tokens em texto puro), `extension/.env.production`, `extension/.env.local`, `.claude/`, `.omc/`.
`AGENTS.md` e `CLAUDE.md` (só importa este arquivo) são versionados.

## Extensão

- Código em `extension/` (WXT + React, features em `src/features/`). Comandos a partir de `extension/`.
- Testes: `pnpm test` (lógica pura com `node --test`); tipos: `pnpm compile`.
- Build de produção exige `extension/.env.production` com `WXT_BACKEND_URL` (modelo em `.env.example`); `pnpm dev` usa `http://localhost:8080`.
- Só o background fala com o backend; a UI usa `lib/backend.ts`. Nenhum token no código da extensão.

## Backend

- Código em `backend/` (Java 21, Spring Boot, hexagonal). Rodar e publicar: `backend/README.md`.
- Testes: `cd backend && ./mvnw test` (precisa de Docker).
- Segredos só em variáveis de ambiente do Dokploy; nunca no repo nem na wiki.
