import { apiFetchWithStatus } from "./api";

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  // Pass the real HTTP status through so the generated client can discriminate
  // responses (201 Created, etc.) instead of every call reporting 200.
  const { data, status } = await apiFetchWithStatus<any>(url, options);
  return { data, status, headers: new Headers() } as unknown as T;
};
