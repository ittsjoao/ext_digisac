import type { Paginated, ServiceItem } from "./types";
import { request } from "./client";

export async function listServices(): Promise<ServiceItem[]> {
  const query = JSON.stringify({ attributes: ["id", "name"] });
  const res = await request<Paginated<ServiceItem>>(
    `services?query=${encodeURIComponent(query)}&perPage=35`
  );
  return res.data;
}
