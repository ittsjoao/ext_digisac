import type { TransferPayload, Paginated } from "./types";
import { request } from "./client";

export async function transferTicket(
  contactId: string,
  payload: TransferPayload
): Promise<unknown> {
  return request(`contacts/${contactId}/ticket/transfer`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

interface TicketItem {
  id: string;
  isOpen: boolean;
  userId: string | null;
  departmentId: string | null;
}

export interface OpenTicketInfo {
  userId: string | null;
  departmentId: string | null;
}

export async function checkOpenTicket(contactId: string): Promise<OpenTicketInfo | null> {
  const res = await request<Paginated<TicketItem>>(
    `tickets?perPage=1&where[contactId]=${encodeURIComponent(contactId)}&where[isOpen]=true`
  );
  if (res.data.length === 0) return null;
  const { userId, departmentId } = res.data[0];
  return { userId, departmentId };
}
