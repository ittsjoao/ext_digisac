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
Nunca versionar: `*.har` (tokens em texto puro), `src/app/config.ts`, `.claude/`, `.omc/`.
`AGENTS.md` e `CLAUDE.md` (só importa este arquivo) são versionados.
