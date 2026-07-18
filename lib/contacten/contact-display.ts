export const RELATIONSHIP_TYPES = [
  { value: "family", label: "Familie" },
  { value: "friend", label: "Vriend" },
  { value: "colleague", label: "Collega" },
  { value: "business", label: "Zakelijk" },
] as const;

const RELATIONSHIP_LABEL: Record<string, string> = Object.fromEntries(
  RELATIONSHIP_TYPES.map((type) => [type.value, type.label]),
);

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function formatDayMonth(month: number, day: number): string {
  return `${day} ${MONTHS[Math.min(Math.max(month, 1), 12) - 1]}`;
}

export function relationshipLabel(value: string): string {
  return RELATIONSHIP_LABEL[value] ?? value;
}
