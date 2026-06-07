import type { LaventeCarePricingItem } from "./types";

export const LAVENTECARE_PRICING: LaventeCarePricingItem[] = [
  {
    key: "consultancy",
    title: "IT advies en consultancy",
    price: "EUR 95 per uur",
    note: "Voor losse analyse, advies, sparring en systeemkeuzes.",
  },
  {
    key: "discovery",
    title: "Discovery traject",
    price: "EUR 500 - EUR 1.500",
    note: "Afhankelijk van complexiteit, aantal systemen en benodigde interviews.",
  },
  {
    key: "implementation",
    title: "Implementatie",
    price: "Maatwerk",
    note: "Gebaseerd op blueprint, scope, integraties, risico en planning.",
  },
  {
    key: "sla-essential",
    title: "SLA Essential",
    price: "EUR 75 per maand",
    note: "Basis support en klein onderhoud.",
  },
  {
    key: "sla-professional",
    title: "SLA Professional",
    price: "EUR 150 per maand",
    note: "Meer proactief beheer, monitoring en snellere opvolging.",
  },
  {
    key: "sla-enterprise",
    title: "SLA Enterprise",
    price: "Vanaf EUR 300 per maand",
    note: "Maatwerkafspraken voor kritieke systemen en complexe omgevingen.",
  },
];

