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
}

export async function checkOpenTicket(contactId: string): Promise<boolean> {
  const res = await request<Paginated<TicketItem>>(
    `tickets?perPage=1&where[contactId]=${encodeURIComponent(contactId)}&where[isOpen]=true`
  );
  return res.data.length > 0;
}
