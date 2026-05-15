import { request } from "./client";
import type { Paginated } from "./types";

interface TagItem {
  id: string;
  label: string;
}

export async function getTags(): Promise<TagItem[]> {
  const res = await request<Paginated<TagItem>>("tags?perPage=40");
  return res.data;
}

export async function addTagToContacts(tagId: string, contactIds: string[]): Promise<void> {
  await request(`tags/${tagId}/contacts`, {
    method: "POST",
    body: JSON.stringify({ where: { id: contactIds } }),
  });
}
