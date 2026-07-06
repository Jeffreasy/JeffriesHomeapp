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
    note: "Hangt af van hoe ingewikkeld het is, het aantal systemen en het aantal gesprekken dat nodig is.",
  },
  {
    key: "implementation",
    title: "Implementatie",
    price: "Maatwerk",
    note: "Op basis van de blueprint (het plan), de afspraak, koppelingen met andere systemen, risico en planning.",
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
    note: "We houden je systeem actief in de gaten en pakken dingen sneller op.",
  },
  {
    key: "sla-enterprise",
    title: "SLA Enterprise",
    price: "Vanaf EUR 300 per maand",
    note: "Afspraken op maat voor systemen die niet plat mogen en voor ingewikkelde omgevingen.",
  },
];

