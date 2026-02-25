Você é o Claude Code. Crie uma extensão Chrome MV3 usando WXT + React + TypeScript com UI em shadcn/ui (Tailwind + Radix). O objetivo é injetar um botão na interface do site DigiSac (auster.digisac.co) e abrir um modal overlay (React) com fluxo: login por e-mail -> carregar services e departments -> validar permissões -> escolher conexão (service) -> carregar contatos -> escolher contato -> escolher departamento -> (opcional) escolher usuário -> (opcional) comentário -> abrir chamado via endpoint transfer.

BASE URL:
https://auster.digisac.co/api/v1/

AUTH:
Bearer token (header Authorization: Bearer <token>).
Token será configurado pelo usuário na aba Settings.

INJEÇÃO (HEADER SELECTOR):
- Default selector (facilmente alterável) deve ficar em src/dom/selectors.ts:
  export const DIGISAC_HEADER_SELECTOR =
    'div[style*="display: flex"][style*="justify-content: space-between"][style*="padding: 0px 16px"]'
- Documentar no README que este é o local para trocar o seletor.

REGRA DE PERMISSÕES:
- Admin TI: lista fixa no código (array de emails) para eu editar depois.
- Permissões por email: também lista fixa no código para eu editar depois.
- Se usuário não estiver em nenhuma regra: negar acesso (mostrar aviso "Solicite ao T&I").

IMPORTANTE: NÃO crie um arquivo gigante. Estruture em módulos pequenos e componentes pequenos.

1) Inicialização do projeto
- Execute exatamente: pnpm dlx wxt@latest init
- Selecione template React + TypeScript
- Use pnpm no projeto
- Garanta scripts: dev, build, zip funcionando.

2) UI / CSS / shadcn
- Configure Tailwind (se o template não tiver).
- Configure shadcn/ui no projeto:
  - criar components.json
  - colocar componentes em src/components/ui
  - adicionar: button, dialog, input, label, select, tabs, textarea, separator, badge, scroll-area, table (para admin/perm), tooltip (opcional).
- Para toast use sonner (padrão shadcn).
- Evitar CSS manual grande; usar Tailwind.

3) Estrutura obrigatória (organizada)
Crie:

entrypoints/
  content.ts                   // bootstrap mínimo
  popup/                       // pode manter padrão

src/
  app/
    init.ts                    // orquestra inicialização (injetar botão, montar react)
    config.ts                  // constantes: baseUrl default, matches, etc.
    permissions.ts             // regras fixas (adminEmails, permsMap)
  dom/
    selectors.ts               // DIGISAC_HEADER_SELECTOR, etc.
    waitForElement.ts
    observer.ts
  storage/
    settings.ts                // token e config básica
    auth.ts                    // email do usuário logado
    history.ts                 // histórico de tickets (opcional)
  api/
    client.ts                  // fetch wrapper
    types.ts                   // interfaces
    users.ts
    services.ts
    departments.ts
    contacts.ts
    tickets.ts
  ui/
    mount.tsx                  // monta container e React root no DOM
    injected/
      injectButton.ts          // injeta botão e abre modal
    modal/
      MainModal.tsx            // Dialog + Tabs
      tabs/
        TicketTab/
          TicketTab.tsx
          LoginBlock.tsx
          ServiceSelect.tsx
          ContactPicker.tsx
          DepartmentSelect.tsx
          UserSelect.tsx
          CommentBox.tsx
          SubmitBar.tsx
        SettingsTab.tsx
        AdminTab.tsx           // só aparece se email em adminEmails
        HistoryTab.tsx
  state/
    store.ts                   // Zustand store (preferir Zustand)
  utils/
    logger.ts
    debounce.ts
    normalize.ts               // lowerCase email etc.

4) Content script (Opção A)
- entrypoints/content.ts deve ser pequeno e apenas chamar init().
- O content script deve:
  a) aguardar header do DigiSac usando DIGISAC_HEADER_SELECTOR
  b) injetar um botão "Abrir Chamado" no header
  c) ao clicar, montar React root (se não existir) e abrir modal
  d) manter MutationObserver para reinjetar botão quando o header recriar (SPA)

5) Modal (shadcn Dialog + Tabs)
Tabs:
- Ticket (principal)
- Settings (token)
- Admin (apenas admin TI)
- History (opcional)

6) Fluxo detalhado do Ticket (com endpoints reais)

6.1) Login (por e-mail)
- Mostrar input de email e botão "Entrar"
- Ao clicar "Entrar":
  - chamar GET /users?query={"attributes":["name","email"],"include":[{"model":"departments","attributes":["name"]}],"page":1,"perPage":1000}
  - validar se o email existe em data[].email (case-insensitive)
  - se existir: salvar auth { email, name, departmentsNames[] } em chrome.storage.local e no store.
  - se não existir: toast erro "E-mail não encontrado".

6.2) Carregamento após login
- Chamar em paralelo:
  A) GET /services?query={"attributes":["id","name"]}&perPage=35
  B) GET /departments?perPage=40&attributes[0]=id&attributes[1]=name
  C) GET /users?query={"attributes":["id","name","email"],"include":[{"model":"departments","attributes":["name"]}],"page":1,"perPage":1000}
- Guardar em store: services[], departments[], usersFull[].

7) Permissões (fixas no código)
Em src/app/permissions.ts:
- export const ADMIN_EMAILS: string[] = ["ti1@...", "ti2@..."] // placeholders
- export const PERMISSIONS_BY_EMAIL: Record<string, { allowedServiceIds: string[]; allowedDepartmentIds: string[]; }> = {
   "user@auster...": { allowedServiceIds: [...], allowedDepartmentIds: [...] }
  }
- Funções:
  - isAdmin(email)
  - getAllowedServices(email, services)
  - getAllowedDepartments(email, departments)
- Se email não existir no map e não for admin: negar acesso (mostrar card no TicketTab com instrução "Solicite ao T&I").
- Admin vê tudo automaticamente.

8) Ticket UI e Lógica

Campos do TicketTab, com validações:
1) Dropdown Conexão (Service)
- listar services filtrados por permissão
- ao selecionar serviceId:
  - chamar GET /contacts?where[serviceId]=${serviceId}&perPage=2000&query={ "attributes":["id","name","internalName","lastMessageAt","data"], "include":[{"model":"tags","attributes":["label"],"required":true}] }
  - guardar lista de contatos no store (cache por serviceId)

2) Seleção de Contato
- Input de busca (filtra client-side com debounce 150-250ms)
- Lista scrollável (ScrollArea) mostrando: name, internalName, lastMessageAt e badges com tags labels
- Ao clicar item: seleciona contactId/contactName

3) Dropdown Departamento
- listar departments filtrados por permissão

4) Dropdown Usuário (opcional)
- Mostrar apenas usuários que têm departments contendo o department.name (comparação por nome).
- Users vêm do endpoint C (users com id). Filtrar em memória.
- Opção "Sem responsável" (valor vazio)

5) Comentário (opcional)
- textarea

6) Botão "Abrir chamado"
- validar: serviceId, contactId, departmentId obrigatórios
- chamar POST /contacts/${contactId}/ticket/transfer
  body JSON:
   {
     "departmentId": departmentId,
     "userId": userId (somente se preenchido),
     "comments": comments (somente se preenchido)
   }
- Ao sucesso:
  - toast sucesso
  - salvar em history (storage): { date, email, serviceId, serviceName, contactId, contactName, departmentId, departmentName, userId?, userName?, comments? }
  - limpar contato e comentário (manter service/department se quiser)
  - opcional: fechar modal

9) Settings Tab
- Campo token (Input type password) + botão "Salvar"
- Salvar token no storage
- Mostrar aviso se token vazio ("Configure para usar a extensão")
- BaseUrl fixo, mostrar como texto readonly.

10) Admin Tab
- Como permissões são fixas no código, AdminTab deve:
  - mostrar instrução "editar em src/app/permissions.ts"
  - renderizar leitura das regras atuais (ADMIN_EMAILS e PERMISSIONS_BY_EMAIL) em tabela.

11) History Tab
- Listar últimos 20 items do history do storage
- Botão "Limpar histórico"

12) API Client
- src/api/client.ts:
  - baseUrl default
  - pega token do storage
  - headers { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' }
  - request<T>(path, init): lida com erros e retorna JSON tipado.
- Implementar endpoints:
  - users.ts: getUsersForLogin(), getUsersFull()
  - services.ts: listServices()
  - departments.ts: listDepartments()
  - contacts.ts: listContactsByService(serviceId)
  - tickets.ts: transferTicket(contactId, payload)

13) Tipagens
- Criar interfaces em src/api/types.ts:
  - Paginated<T>
  - UserLoginItem, UserFullItem (id,name,email,departments[{name}])
  - ServiceItem
  - DepartmentItem
  - ContactItem, ContactTag, ContactData
  - TransferPayload
- Tipar todas as chamadas.

14) wxt.config.ts
- content scripts matches: ["*://auster.digisac.co/*"]
- permissions: ["storage"]
- host_permissions: ["https://auster.digisac.co/*"]
- Manifest MV3 compatível.

15) README
- Como rodar: pnpm install, pnpm dev
- Como carregar no Chrome (Load unpacked na pasta output do WXT)
- Onde ajustar selector do header: src/dom/selectors.ts
- Onde colocar permissões/admin emails: src/app/permissions.ts
- Como configurar token na aba Settings

QUALIDADE
- Nenhum arquivo > 250 linhas. Componentize.
- EntryPoint content.ts minimal.
- Sem secrets hardcoded.
- Código deve compilar com tsc.

Execute e gere todos os arquivos.
