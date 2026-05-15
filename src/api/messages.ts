import { request } from "./client";

const NOTIFY_CONTACT_ID = "94e5d28d-889c-4241-9927-023b3965d164";
const NOTIFY_USER_ID = "86dd8bc8-0b08-40c9-b46b-9b9ec517171c";

function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface NotifyParams {
  collaboratorName: string;
  department: string;
  serviceName: string;
}

function sendNotify(text: string): Promise<void> {
  return request("messages", {
    method: "POST",
    body: JSON.stringify({
      text,
      type: "chat",
      contactId: NOTIFY_CONTACT_ID,
      userId: NOTIFY_USER_ID,
      origin: "user",
    }),
  });
}

export function sendRegistrationNotification(params: NotifyParams): Promise<void> {
  const { collaboratorName, department, serviceName } = params;
  const date = formatDate(new Date());
  return sendNotify(
    `📋 Novo Número Cadastrado\n\nO colaborador ${collaboratorName} realizou um novo cadastro de número.\n\n👤 Colaborador — ${collaboratorName}\n🏢 Departamento — ${department}\n📲 Cadastro via — Extensão\n🔗 Conexão — ${serviceName}\n📅 Data — ${date}`,
  );
}

export function sendDuplicateNotification(params: NotifyParams): Promise<void> {
  const { collaboratorName, department, serviceName } = params;
  const date = formatDate(new Date());
  return sendNotify(
    `⚠️ Tentativa de Cadastro Duplicado\n\nO colaborador ${collaboratorName} tentou cadastrar um número que já existe com tags no DigiSac.\n\n👤 Colaborador — ${collaboratorName}\n🏢 Departamento — ${department}\n📲 Cadastro via — Extensão\n🔗 Conexão — ${serviceName}\n📅 Data — ${date}`,
  );
}
