import type { LaventeCareProcessStage } from "./types";

export const LAVENTECARE_PROCESS_STAGES: LaventeCareProcessStage[] = [
  {
    key: "intake",
    title: "Intake",
    summary:
      "Kwalificeren of er een echte businesscase is: probleem, urgentie, impact, eigenaarschap en budgetrichting.",
    output: "Heldere fit/no-fit, eerste scope en vervolgstap.",
  },
  {
    key: "discovery",
    title: "Discovery",
    summary:
      "Huidige situatie, systemen, workflows, knelpunten, risico's en kansen in kaart brengen.",
    output: "Systeemanalyse met proceskaart, prioriteiten en requirements.",
  },
  {
    key: "blueprint",
    title: "Blueprint",
    summary:
      "Oplossingsrichting vertalen naar architectuur, fasering, deliverables, planning en beslispunten.",
    output: "Blueprint als leidend projectdocument.",
  },
  {
    key: "realisatie",
    title: "Realisatie",
    summary:
      "Bouwen, testen, opleveren en overdraagbaar maken met gecontroleerde scope en changelog.",
    output: "Werkend systeem met documentatie en acceptatie.",
  },
  {
    key: "sla",
    title: "SLA en beheer",
    summary:
      "Support, monitoring, incidenten, wijzigingsverzoeken en continuiteit professioneel borgen.",
    output: "Afspraken over responstijden, onderhoud en opvolging.",
  },
  {
    key: "evolution",
    title: "Doorontwikkeling",
    summary:
      "Periodiek verbeteren op basis van data, feedback, nieuwe processen en groeidoelen.",
    output: "Roadmap, optimalisaties en nieuwe iteraties.",
  },
];

