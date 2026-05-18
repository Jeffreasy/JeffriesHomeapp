import { apiFetch } from "./api";

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const data = await apiFetch<any>(url, options);
  return { data, status: 200, headers: new Headers() } as unknown as T;
};
