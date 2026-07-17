export function parseTagInput(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
    .filter((tag, index, all) => Boolean(tag) && all.indexOf(tag) === index);
}

export type CompanyStatus = "actief" | "prospect" | "inactief";
export function normalizeCompanyStatus(value?: string | null): CompanyStatus {
  return value === "actief" || value === "prospect" || value === "inactief"
    ? value
    : "actief";
}

export type CompanyRelation = "prospect" | "klant" | "partner" | "leverancier" | "intern" | "eigen_project";
export function normalizeCompanyRelation(value?: string | null): CompanyRelation {
  return value === "prospect" ||
    value === "klant" ||
    value === "partner" ||
    value === "leverancier" ||
    value === "intern" ||
    value === "eigen_project"
    ? value
    : "prospect";
}
