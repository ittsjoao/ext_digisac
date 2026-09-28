import type { Paginated, ContactItem } from "./types";
import { request } from "./client";

export async function listContactsByService(
  serviceId: string,
): Promise<ContactItem[]> {
  const res = await request<Paginated<ContactItem>>(
    `contacts?where[serviceId]=${serviceId}&perPage=2000&query={"attributes": ["id", "name", "internalName", "lastMessageAt", "data"],"include": [{"model": "tags","attributes": ["label"],"required": true}]}`,
  );
  return res.data;
}

interface ContactSearchResult {
  id: string;
  tags: { label: string }[];
}

export async function searchContactByPhone(
  last8: string,
  serviceId: string,
): Promise<ContactSearchResult | null> {
  const res = await request<{ data: ContactSearchResult[] }>(
    `contacts?where[data.number][$iLike]=%25${last8}%25&where[serviceId]=${serviceId}&include[0]=tags&include[1]`,
  );
  return res.data[0] ?? null;
}

export async function createContact(payload: {
  internalName: string;
  number: string;
  serviceId: string;
  tagIds: string[];
}): Promise<{ id: string }> {
  return request<{ id: string }>("contacts", {
    method: "POST",
    body: JSON.stringify({ ...payload, defaultDepartmentId: null, customFields: [] }),
  });
}

export async function updateContact(
  contactId: string,
  payload: { internalName: string; tagIds: string[] },
): Promise<void> {
  await request(`contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
