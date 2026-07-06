import type { LaventeCareProcessStage } from "./types";

export const LAVENTECARE_PROCESS_STAGES: LaventeCareProcessStage[] = [
  {
    key: "intake",
    title: "Intake",
    summary:
      "Samen kijken of er een echte zaak ligt: wat is het probleem, hoe dringend is het, wat levert het op, wie beslist en welk budget is er ongeveer.",
    output: "Duidelijk of het past of niet, een eerste afspraak en de vervolgstap.",
  },
  {
    key: "discovery",
    title: "Discovery",
    summary:
      "We brengen in kaart hoe het nu werkt: je systemen, werkwijzen, knelpunten, risico's en kansen.",
    output: "Een analyse met een overzicht van je processen, prioriteiten en eisen.",
  },
  {
    key: "blueprint",
    title: "Blueprint",
    summary:
      "We zetten de oplossing om in een technisch ontwerp, de stappen, wat je krijgt, de planning en de punten waarop je beslist.",
    output: "Een blueprint: het plan dat het hele project stuurt.",
  },
  {
    key: "realisatie",
    title: "Realisatie",
    summary:
      "Bouwen, testen en opleveren, zodat je het kunt overnemen. We houden ons aan de afspraak en leggen alle wijzigingen vast.",
    output: "Een werkend systeem met uitleg, dat je hebt goedgekeurd.",
  },
  {
    key: "sla",
    title: "SLA en beheer",
    summary:
      "We regelen support, houden je systeem in de gaten, lossen storingen op, voeren wijzigingen door en zorgen dat alles blijft draaien.",
    output: "Afspraken over hoe snel we reageren, onderhoud en opvolging.",
  },
  {
    key: "evolution",
    title: "Doorontwikkeling",
    summary:
      "We verbeteren je systeem regelmatig op basis van cijfers, feedback, nieuwe werkwijzen en je groeidoelen.",
    output: "Een plan voor de toekomst, verbeteringen en nieuwe versies.",
  },
];

