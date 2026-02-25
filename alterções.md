Esta tarefa consiste em refatorar a gestão de usuários, implementar uma validação de tickets ativos e ajustar a interface da extensão.

1. Interface e Experiência do Usuário (UI/UX)
Aba "Settings" (Configurações)
Migração de Campo: Remover o campo de identificação do usuário da aba "Ticket" e movê-lo para a aba "Settings".

Funcionalidade de Logoff: Adicionar um botão de "Sair" ou "Logoff" nas configurações.

Restrição de Abas: Usuários comuns devem ter acesso visual apenas às seguintes abas:

Ticket

Histórico

Settings (contendo apenas a opção de logout)

2. Validação de Usuário (Autenticação Dinâmica)
A permissão de uso do sistema não deve ser uma lista estática. A validação deve ser feita via API.

Endpoint: {{URL}}/api/v1/users?perPage=40&where[email]={{userEmail}}

Regra de Negócio:

Sucesso: Se o array data retornar um objeto de usuário (total > 0), o acesso é permitido.

Bloqueio: Se o array data estiver vazio ([]), o usuário não está autorizado a utilizar a extensão.

Para as permissões destes usuários crie uma forma onde no settings seja possível selecionar o departamentoe selecionar as permissões que este departemento terá, como por exemplo: quais conexões este departamento verá e quais departamentos este departamento verá. Essas permissões devem ser salvas em um arquivo xml dentro do código e toda vez que o usuário utilizar, ele lerá este arquivo. Caso tenha alguma divergência neste ponto, me informe.

3. Fluxo de Validação de Ticket Aberto
Ao clicar em um contato, a extensão deve verificar se já existe um atendimento em curso antes de permitir a abertura de um novo ticket.

Consulta à API
GET: {{URL}}/api/v1/tickets?where[contactId]={{contactId}}&where[isOpen]=true&query={"attributes":["isOpen"]}

4. Exemplos de JSON para Referência
Resposta: Usuário Autorizado
JSON
{
    "data": [{ "id": "...", "name": "João Silva", "email": "joao.silva@..." }],
    "total": 1
}
Resposta: Ticket Já Aberto (Bloqueio)
JSON
{
    "data": [{ "isOpen": true }],
    "total": 1
}
