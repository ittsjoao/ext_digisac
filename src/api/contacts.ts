import type { Paginated, ContactItem } from "./types";
import { request } from "./client";

export async function listContactsByService(
  serviceId: string,
): Promise<ContactItem[]> {
  const query = JSON.stringify({
    attributes: ["id", "name", "internalName", "data"],
    include: [{ model: "tags", attributes: ["label"], required: true }],
  });
  const res = await request<Paginated<ContactItem>>(
    `contacts?where[serviceId]=${serviceId}&perPage=2000&query={"attributes": ["id", "name", "internalName", "lastMessageAt", "data"],"include": [{"model": "tags","attributes": ["label"],"required": true}]}`,
  );
  return res.data;
}
