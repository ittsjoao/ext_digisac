# backend

API da extensão DigiSac multi-empresa: autenticação pelo `/me` do DigiSac, licença por empresa, permissões e casos de uso DigiSac/G-Click. Java 21 + Spring Boot 4.0, hexagonal (`domain/` e `application/` sem Spring).

## Rodar os testes

Precisa de JDK 21 e Docker rodando (Testcontainers sobe um Postgres).

```bash
./mvnw test
```

## Variáveis de ambiente

| Variável | O que é |
|---|---|
| `DB_URL` | `jdbc:postgresql://<host-interno>:5432/<banco>` |
| `DB_USER`, `DB_PASS` | credenciais do Postgres |
| `APP_MASTER_KEY` | 32 bytes em base64 (`openssl rand -base64 32`); cifra os tokens das empresas |
| `SESSION_SECRET` | 32+ caracteres aleatórios (`openssl rand -base64 48`); assina o token de sessão |
| `ADMIN_KEY` | chave do painel local (`openssl rand -base64 32`) |
| `MIN_EXT_VERSION` | versão mínima aceita da extensão (ex.: `5.1.0`) |
| `OWNER_CONTACT` | contato exibido quando a licença está pendente, bloqueada ou vencida |
| `ADMIN_ORIGIN` | origem do painel local (padrão `http://localhost:8765`) |

Perder a `APP_MASTER_KEY` torna os tokens gravados irrecuperáveis: guarde-a no cofre, separada do backup do banco.

## Deploy no Dokploy

1. Crie um banco **PostgreSQL** no projeto, sem porta externa. Anote host interno, banco, usuário e senha.
2. Crie uma **Application** apontando para este repositório, branch `main`, build type **Dockerfile**, build path `backend`.
3. Em **Environment**, preencha as variáveis da tabela acima.
4. Em **Domains**, adicione `api.<seu-domínio>`, porta `8080`, HTTPS com Let's Encrypt.
5. Deploy. Verifique `https://api.<seu-domínio>/actuator/health` → `{"status":"UP"}`.
6. No Postgres do Dokploy, agende backup para um destino S3 (Cloudflare R2 free tier).
7. Exponha o backend só pelo Traefik do Dokploy: o rate limit usa o último IP do `X-Forwarded-For`, que o Traefik acrescenta; acesso direto à porta 8080 permitiria forjar esse IP.

Rode `./mvnw test` antes do push: o build da imagem pula os testes.
