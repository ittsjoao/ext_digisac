# DigiSac Ticket Extension

Extensão Chrome (MV3) para abrir chamados no DigiSac.

## Instalação

```bash
pnpm install
```

## Configuração

Antes de rodar o projeto, crie o arquivo de configuração:

```bash
cp src/app/config.ts.exemple src/app/config.ts
```

Edite `src/app/config.ts` com seus dados:

```ts
export const BASE_URL = "https://sua.url/api/v1";
export const ADMIN_EMAILS: string[] = ["emails.admins@email.com.br"];
export const CONTENT_MATCHES = ["*://sua.url/*"];
export const STORAGE_KEY_TOKEN = "suaApiKey";
```

| Campo | Descrição |
|-------|-----------|
| `BASE_URL` | URL base da API DigiSac |
| `ADMIN_EMAILS` | E-mails com acesso à aba Admin |
| `CONTENT_MATCHES` | Padrão de URL onde a extensão será injetada |
| `STORAGE_KEY_TOKEN` | Token Bearer da API |

> **Importante:** O arquivo `config.ts` está no `.gitignore` e nunca deve ser commitado.

## Desenvolvimento

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Carregar no Chrome

1. Acesse `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Clique "Carregar sem compactação"
4. Selecione a pasta `.output/chrome-mv3`

## Permissões por Departamento

As permissões padrão ficam em `src/app/department-permissions.json`. O admin pode editá-las pela aba **Admin** da extensão, e as alterações são salvas no `browser.storage.local`.

Para exportar/importar permissões, use os botões **JSON** e **Restaurar** na aba Admin.
