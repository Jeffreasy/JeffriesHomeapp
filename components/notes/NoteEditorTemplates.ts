import type { AppIconName } from "@/lib/symbols";
import type { BusinessContextValue } from "@/lib/workspace-context";
export const KLEUREN = [
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];

export const PRIORITEITEN = [
  { value: "hoog", label: "Hoog", dot: "bg-red-500" },
  { value: "normaal", label: "Normaal", dot: "bg-slate-500" },
  { value: "laag", label: "Laag", dot: "bg-blue-400" },
] as const;

export const NOTE_TEMPLATE_CATEGORIES = ["Algemeen", "Werk", "LaventeCare", "Veiligheid"] as const;
export type NoteTemplateCategory = (typeof NOTE_TEMPLATE_CATEGORIES)[number];
export type NoteTemplate = {
  id: string;
  title: string;
  label: string;
  category: NoteTemplateCategory;
  description: string;
  icon: AppIconName;
  content: string;
  tags?: string[];
  priority?: (typeof PRIORITEITEN)[number]["value"];
  symbol?: AppIconName;
  businessContext?: BusinessContextValue;
};

const LAVENTECARE_TEMPLATE_CONTEXT: BusinessContextValue = {
  type: "laventecare",
  title: "LaventeCare",
};

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "evaluatie",
    title: "Evaluatie",
    label: "Evaluatie",
    category: "Algemeen",
    description: "Terugblik met verbeterpunten en concrete vervolgacties.",
    icon: "chart",
    content: "## Wat ging goed?\n\n## Wat kan beter?\n\n## Acties\n- [ ] ",
  },
  {
    id: "dagstart",
    title: "Dagstart",
    label: "Dagstart",
    category: "Algemeen",
    description: "Korte dagfocus voor prioriteiten, energie en afsluiting.",
    icon: "calendar",
    tags: ["dagstart", "focus"],
    symbol: "calendar",
    content:
      "## Vandaag belangrijk\n- [ ] \n\n" +
      "## Planning\n\n" +
      "## Energie en focus\n\n" +
      "## Einde dag check\n- [ ] Afgerond of verplaatst\n- [ ] Morgen voorbereid\n",
  },
  {
    id: "dienst",
    title: "Dienstnotitie",
    label: "Dienst",
    category: "Werk",
    description: "Overdracht, bijzonderheden en acties rondom een dienst.",
    icon: "roster",
    content: "## Dienst\n\n## Bijzonderheden\n\n## Overdracht\n- [ ] ",
  },
  {
    id: "gesprek",
    title: "Gespreksnotitie",
    label: "Gesprek",
    category: "Werk",
    description: "Bespreking vastleggen met besluiten en opvolging.",
    icon: "note",
    tags: ["gesprek", "actie"],
    symbol: "note",
    content:
      "## Context\n- Met: \n- Aanleiding: \n- Datum/tijd: \n\n" +
      "## Besproken\n\n" +
      "## Besluiten\n\n" +
      "## Acties\n- [ ] \n",
  },
  {
    id: "planning",
    title: "Planning",
    label: "Planning",
    category: "Werk",
    description: "Doel, stappen en deadline overzichtelijk maken.",
    icon: "calendar",
    content: "## Doel\n\n## Stappen\n- [ ] \n\n## Deadline\n",
  },
  {
    id: "besluit",
    title: "Besluit",
    label: "Besluit",
    category: "Werk",
    description: "Waarom iets besloten is en wat de impact wordt.",
    icon: "shield",
    content: "## Besluit\n\n## Reden\n\n## Impact\n\n## Volgende stap\n- [ ] ",
  },
  {
    id: "klantdossier",
    title: "Klantdossier notitie",
    label: "Klantdossier",
    category: "LaventeCare",
    description: "Klantcontext, contactpersoon, signalen en acties bundelen.",
    icon: "business",
    tags: ["laventecare", "klantcontext"],
    symbol: "business",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Klant/context\n- Klant: \n- Contactpersoon: \n- Relatie: prospect / klant / partner / leverancier / eigen_project\n- Website: \n- Koppeling: klantdossier / project / opdracht\n\n" +
      "## Signaal\n\n" +
      "## Belangrijk\n\n" +
      "## Acties\n- [ ] \n",
  },
  {
    id: "project",
    title: "Projectnotitie",
    label: "Project",
    category: "LaventeCare",
    description: "Scope, fase, risico's en volgende stap voor klantwerk.",
    icon: "work",
    tags: ["laventecare", "project", "opdracht"],
    symbol: "work",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Project/opdracht\n- Klant: \n- Fase: intake / pilot / build / oplevering / beheer\n- Doel: \n- Deadline: \n\n" +
      "## Scope\n- In: \n- Uit: \n\n" +
      "## Risico's of keuzes\n\n" +
      "## Volgende stap\n- [ ] \n",
  },
  {
    id: "pilot",
    title: "Pilot en testfase",
    label: "Pilot",
    category: "LaventeCare",
    description: "Testscope, criteria en veilige toegang voor pilots.",
    icon: "radar",
    tags: ["laventecare", "pilot", "testfase"],
    priority: "hoog",
    symbol: "radar",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Pilot/testfase\n- Klant: \n- Omgeving: test / pilot / productie\n- Startdatum: \n- Feedbackmoment: \n\n" +
      "## Testscope\n- [ ] \n\n" +
      "## Acceptatiecriteria\n- [ ] Kernfunctionaliteit werkt\n- [ ] Gebruiksgemak is getest\n- [ ] Betrouwbaarheid is akkoord\n\n" +
      "## Toegang\n- Accounts vastgelegd: ja / nee\n- Veilig kanaal: \n- Let op: geen wachtwoorden in klantmail opnemen.\n\n" +
      "## Vervolg\n- [ ] \n",
  },
  {
    id: "mail-briefing",
    title: "Mailbriefing",
    label: "Mailbriefing",
    category: "LaventeCare",
    description: "Interne briefing voor AI-mail met relevante context.",
    icon: "mail",
    tags: ["laventecare", "mail", "briefing"],
    symbol: "mail",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Mailcontext\n- Klant: \n- Contactpersoon: \n- Template: intake / update / pilot / oplevering / follow-up\n- Doel van de mail: \n\n" +
      "## Interne bronnen\n- Notities: \n- Agenda: \n- Project/opdracht: \n\n" +
      "## Kernboodschap voor klant\n\n" +
      "## Niet meesturen naar klant\n- \n",
  },
  {
    id: "incident",
    title: "Support incident",
    label: "Incident",
    category: "LaventeCare",
    description: "Probleem, impact, diagnose en afronding bij klantissues.",
    icon: "alert",
    tags: ["laventecare", "support", "incident"],
    priority: "hoog",
    symbol: "alert",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Incident\n- Klant/context: \n- Ernst: laag / normaal / hoog\n- Start: \n- Impact: \n\n" +
      "## Diagnose\n\n" +
      "## Actie\n- [ ] \n\n" +
      "## Afronding\n- Oorzaak: \n- Oplossing: \n- Klant geinformeerd: ja / nee\n",
  },
  {
    id: "accounts",
    title: "Accountgegevens",
    label: "Accounts",
    category: "Veiligheid",
    description: "Pilotaccounts en toegangsbeheer zonder klantmail-lek.",
    icon: "shield",
    tags: ["laventecare", "accounts", "toegang", "veilig"],
    priority: "hoog",
    symbol: "shield",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Accountgegevens\n\n" +
      "## Context\n" +
      "- Klant/context: \n" +
      "- Project/pilot: \n" +
      "- Doel van toegang: \n" +
      "- Omgeving: test / pilot / productie\n" +
      "- Status: actief / tijdelijk / verlopen\n\n" +
      "## Accounts\n" +
      "### Account 1\n" +
      "- E-mail/gebruikersnaam: \n" +
      "- Rol/rechten: \n" +
      "- Wachtwoord/verwijzing: veilig kanaal / vault / tijdelijk\n" +
      "- 2FA/herstel: \n" +
      "- Eigenaar/contact: \n" +
      "- Laatst getest: \n\n" +
      "## Veilig delen\n" +
      "- Gevoelige gegevens alleen delen via afgesproken veilig kanaal.\n" +
      "- Laatst gecontroleerd: \n" +
      "- Vervaldatum / intrekken na pilot: \n\n" +
      "## Acties\n" +
      "- [ ] Toegang testen\n" +
      "- [ ] Klant bevestigen dat toegang werkt\n" +
      "- [ ] Na pilot toegang intrekken of omzetten\n",
  },
] as const;

export const NOTE_TEMPLATE_GROUPS = NOTE_TEMPLATE_CATEGORIES.map((category) => ({
  category,
  templates: NOTE_TEMPLATES.filter((template) => template.category === category),
}));
