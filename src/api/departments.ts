import type { Paginated, DepartmentItem } from "./types";
import { request } from "./client";

export async function listDepartments(): Promise<DepartmentItem[]> {
  const res = await request<Paginated<DepartmentItem>>(
    `departments?perPage=40&attributes[0]=id&attributes[1]=name`
  );
  return res.data;
}
