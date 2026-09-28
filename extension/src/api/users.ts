import type { Paginated, UserLoginItem, UserFullItem } from "./types";
import { request } from "./client";

export async function validateUserByEmail(
  email: string
): Promise<UserLoginItem | null> {
  const res = await request<Paginated<UserLoginItem>>(
    `users?perPage=40&where[email]=${encodeURIComponent(email)}&query={"attributes":["id","name","email"],"include":[{"model":"departments","attributes":["name"]}]}`
  );
  return res.data.length > 0 ? res.data[0] : null;
}

export async function getUsersFull(): Promise<UserFullItem[]> {
  const res = await request<Paginated<UserFullItem>>(
    `users?query={"attributes": ["id", "name", "email"],"where": { "archivedAt": null},"include": [{"model": "departments","attributes": ["name"]}],"page": 1, "perPage": 1000}`,
  );
  return res.data;
}
