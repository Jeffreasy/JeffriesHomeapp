/**
 * convex/ai/grok/tools/definitions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * xAI function calling tool schemas — defines what Grok can do.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "leesEmail",
      description: "Haal de volledige inhoud (body, van, aan, onderwerp, bijlagen) van een specifiek email bericht op via Gmail ID. Gebruik dit wanneer de gebruiker vraagt om een email te lezen of meer context wil over een specifiek bericht.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Het Gmail bericht ID (bijv. '1945a3b2c4d5e6f7')" },
        },
        required: ["gmailId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "zoekEmails",
      description: "Doorzoek alle emails op onderwerp, afzender of inhoud. Gebruik dit als de gebruiker vraagt naar een specifieke email, afzender of onderwerp.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Zoekterm (doorzoekt subject, snippet, afzender)" },
        },
        required: ["zoekterm"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lampBedien",
      description: "Bedien de WiZ lampen. Kan: aan/uit, helderheid, scene, RGB kleur, kleurtemperatuur, of specifieke lamp selecteren. Scenes: 1=Ocean, 2=Romance, 3=Sunset, 4=Party, 5=Fireplace, 6=Cozy, 7=Forest, 8=Pastel Colors, 9=Wake Up, 10=Bedtime, 11=Warm White, 12=Daylight, 13=Cool White, 14=Night Light, 15=Focus, 16=Relax, 17=True Colors, 18=TV Time, 19=Plant Growth, 20=Spring, 21=Summer, 22=Fall, 23=Deep Dive, 24=Jungle, 25=Mojito, 26=Club, 27=Christmas, 28=Halloween, 29=Candlelight, 30=Golden White, 31=Pulse, 32=Steampunk.",
      parameters: {
        type: "object",
        properties: {
          actie: { type: "string", enum: ["aan", "uit", "dim", "vol", "scene", "kleur", "temperatuur"], description: "Type actie" },
          helderheid: { type: "number", description: "Helderheid 1-100 (voor dim/vol)" },
          sceneId: { type: "number", description: "WiZ scene ID (1-32), bijv. 6=Cozy, 18=TV Time" },
          r: { type: "number", description: "Rood (0-255) voor RGB kleur" },
          g: { type: "number", description: "Groen (0-255) voor RGB kleur" },
          b: { type: "number", description: "Blauw (0-255) voor RGB kleur" },
          kleurTemp: { type: "number", description: "Kleurtemperatuur in Kelvin (2200=warm, 4000=neutraal, 6500=koud)" },
          lampNaam: { type: "string", description: "Optioneel: naam van specifieke lamp (bijv. 'Slaapkamer'). Leeg = alle lampen." },
        },
        required: ["actie"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "markeerGelezen",
      description: "Markeer een email als gelezen of ongelezen in Gmail. Gebruik dit na het lezen van een email of wanneer de gebruiker vraagt om emails als gelezen te markeren.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Gmail bericht ID" },
          gelezen: { type: "boolean", description: "true=markeer als gelezen, false=markeer als ongelezen" },
        },
        required: ["gmailId", "gelezen"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "verwijderEmail",
      description: "Verplaats een email naar de prullenbak. Gebruik dit wanneer de gebruiker een email wil verwijderen of opruimen.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Gmail bericht ID" },
        },
        required: ["gmailId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "markeerSter",
      description: "Voeg een ster toe of verwijder deze van een email. Gebruik dit voor belangrijke emails.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Gmail bericht ID" },
          ster: { type: "boolean", description: "true=ster toevoegen, false=ster verwijderen" },
        },
        required: ["gmailId", "ster"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "emailVersturen",
      description: "Verstuur een nieuwe email via Gmail. GEBRUIK DIT ALLEEN als de gebruiker expliciet vraagt om een email te versturen. Vraag altijd eerst om bevestiging.",
      parameters: {
        type: "object",
        properties: {
          aan: { type: "string", description: "Ontvanger email adres" },
          onderwerp: { type: "string", description: "Email onderwerp" },
          body: { type: "string", description: "Email body tekst" },
          cc: { type: "string", description: "CC adressen (optioneel)" },
        },
        required: ["aan", "onderwerp", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "emailBeantwoorden",
      description: "Beantwoord een bestaande email thread. GEBRUIK DIT ALLEEN als de gebruiker expliciet vraagt om te antwoorden. Vraag altijd eerst om bevestiging.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Gmail bericht ID om op te antwoorden" },
          threadId: { type: "string", description: "Thread ID" },
          aan: { type: "string", description: "Ontvanger email adres" },
          body: { type: "string", description: "Reply body tekst" },
        },
        required: ["gmailId", "threadId", "aan", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bulkMarkeerGelezen",
      description: "Markeer MEERDERE emails tegelijk als gelezen. Gebruik dit voor bulk operaties zoals 'markeer alle promoties als gelezen'. Geef een array van gmailIds.",
      parameters: {
        type: "object",
        properties: {
          gmailIds: { type: "array", items: { type: "string" }, description: "Array van Gmail bericht IDs" },
          gelezen: { type: "boolean", description: "true=gelezen, false=ongelezen" },
        },
        required: ["gmailIds", "gelezen"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bulkVerwijder",
      description: "Verwijder MEERDERE emails tegelijk naar prullenbak. Gebruik dit voor bulk opruimen.",
      parameters: {
        type: "object",
        properties: {
          gmailIds: { type: "array", items: { type: "string" }, description: "Array van Gmail bericht IDs" },
        },
        required: ["gmailIds"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "inboxOpruimen",
      description: "Smart inbox opruim-tool. Filtert emails op categorie, leeftijd, of afzender en voert bulk acties uit. Gebruik dit als de gebruiker vraagt om inbox op te schonen, promoties te verwijderen, of nieuwsbrieven op te ruimen.",
      parameters: {
        type: "object",
        properties: {
          filter: { 
            type: "string", 
            enum: ["promoties", "social", "forums", "updates", "oud_ongelezen", "van_afzender"],
            description: "Welke emails te filteren" 
          },
          actie: {
            type: "string",
            enum: ["gelezen_markeren", "verwijderen"],
            description: "Wat te doen met de gefilterde emails"
          },
          afzender: { type: "string", description: "Afzender naam/email (alleen bij filter=van_afzender)" },
          maxAantal: { type: "number", description: "Max aantal emails om te verwerken (default 50)" },
        },
        required: ["filter", "actie"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "dienstenOpvragen",
      description: "Haal diensten/shifts op voor een specifieke maand of periode. Gebruik dit als de gebruiker vraagt naar diensten buiten de huidige 7-dagen context, bijv. 'geef mij april diensten' of 'wat werk ik in mei'. Data beschikbaar van -30 tot +90 dagen.",
      parameters: {
        type: "object",
        properties: {
          maand: { type: "number", description: "Maandnummer (1-12), bijv. 4 voor april" },
          jaar: { type: "number", description: "Jaar, bijv. 2026 (default: huidig jaar)" },
          vanDatum: { type: "string", description: "Optioneel: startdatum YYYY-MM-DD (override maand)" },
          totDatum: { type: "string", description: "Optioneel: einddatum YYYY-MM-DD (override maand)" },
        },
        required: ["maand"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "salarisOpvragen",
      description: "Haal salaris/loon informatie op voor een specifieke maand. Toont bruto, netto, ORT-toeslag, basis loon, en aantal diensten. Gebruik dit als de gebruiker vraagt naar salaris, loon, ORT, of wat ze verdienen in een specifieke maand.",
      parameters: {
        type: "object",
        properties: {
          maand: { type: "number", description: "Maandnummer (1-12)" },
          jaar: { type: "number", description: "Jaar (default: huidig jaar)" },
        },
        required: ["maand"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "transactiesZoeken",
      description: "Doorzoek bank transacties op tegenpartij, omschrijving of categorie. Kan ook ALLE transacties van een specifieke categorie ophalen zonder zoekterm. Toont volledige details inclusief rekening, saldo, code en referentie. Gebruik dit voor: specifieke uitgaven zoeken, alle transacties van een categorie opvragen, of betalingen aan een tegenpartij bekijken.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Optioneel: zoekterm (doorzoekt tegenpartij, omschrijving). Mag leeg bij categorie-filter." },
          categorie: { type: "string", description: "Optioneel: filter op categorie", enum: ["Boodschappen", "Brandstof", "Coffeeshop", "Crypto", "Familie", "Fastfood", "Gaming", "Geldopname", "Interne Overboeking", "Online Winkelen", "Persoonlijk", "SaaS", "SaaS Abonnementen", "Salaris", "Sport", "Streaming", "Telecom", "Toeslagen", "Vakantie", "Vaste Lasten", "Vervoer", "Verzekeringen", "Vrienden", "Vrije Tijd", "Zakelijk", "Zorgverzekering"] },
          rekening: { type: "string", description: "Optioneel: filter op rekening ('betaal' of 'spaar')", enum: ["betaal", "spaar"] },
          maxAantal: { type: "number", description: "Max resultaten (default 50)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "afspraakMaken",
      description: `Maak een professionele persoonlijke afspraak aan met slimme templates. De afspraak wordt automatisch gesynchroniseerd naar Google Calendar met kleurcodering en herinneringen.

BELANGRIJK — Professioneel Template Protocol:
1. Titel: Gebruik een duidelijke, gestructureerde titel. Voeg een relevant emoji prefix toe (☕ sociaal, 💼 werk, 🏥 gezondheid, 🏋️ sport, 📋 admin, 🎓 studie, 🔧 onderhoud, 🎉 evenement).
2. Beschrijving: Genereer ALTIJD een gestructureerde beschrijving met:
   - Doel/context van de afspraak
   - Eventuele agendapunten of voorbereiding
   - Relevante contactinfo of locatiedetails
3. Categorie: Classificeer het type afspraak voor kleurcodering in Google Calendar.
4. Slimme defaults: Als gebruiker geen tijd noemt, kies logische tijden (koffie=10:00-11:00, lunch=12:30-13:30, avondeten=18:00-19:30, sport=07:00-08:00).`,
      parameters: {
        type: "object",
        properties: {
          titel: { type: "string", description: "Professionele titel MET emoji prefix (bijv. '☕ Koffie met Maarten')" },
          startDatum: { type: "string", description: "Startdatum in YYYY-MM-DD formaat" },
          eindDatum: { type: "string", description: "Einddatum in YYYY-MM-DD formaat (zelfde als start voor eendaagse)" },
          startTijd: { type: "string", description: "Starttijd HH:MM — gebruik slimme defaults als gebruiker geen tijd noemt" },
          eindTijd: { type: "string", description: "Eindtijd HH:MM — gebruik slimme defaults" },
          heledag: { type: "boolean", description: "true voor hele dag event, false voor tijdsgebonden" },
          locatie: { type: "string", description: "Locatie (optioneel)" },
          beschrijving: { type: "string", description: "Gestructureerde beschrijving met doel, agendapunten, en voorbereiding" },
          categorie: { type: "string", enum: ["sociaal", "werk", "gezondheid", "sport", "admin", "studie", "onderhoud", "evenement", "overig"], description: "Type afspraak voor Google Calendar kleurcodering" },
        },
        required: ["titel", "startDatum", "eindDatum", "heledag", "categorie"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "afspraakVerwijderen",
      description: "Verwijder een persoonlijke afspraak. Zoekt op titel (zoekterm). De afspraak wordt ook uit Google Calendar verwijderd. Gebruik dit als de gebruiker een afspraak wil verwijderen, annuleren, of cancelen.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Deel van de titel om de afspraak te vinden (bijv. 'koffie')" },
        },
        required: ["zoekterm"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "afsprakenOpvragen",
      description: "Haal persoonlijke afspraken op. Toont aankomende events met eventuele conflicten met werkdiensten. Gebruik dit als de gebruiker vraagt naar agenda, afspraken, of wat er gepland staat.",
      parameters: {
        type: "object",
        properties: {
          aantalDagen: { type: "number", description: "Hoeveel dagen vooruit kijken (default 30)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "afspraakBewerken",
      description: "Bewerk een bestaande persoonlijke afspraak. Wijzig titel, datum, tijd, locatie of beschrijving. De wijziging wordt automatisch gesynchroniseerd naar Google Calendar. Gebruik dit als de gebruiker een afspraak wil verzetten, verplaatsen, of details wil aanpassen.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Deel van de titel om de afspraak te vinden (bijv. 'koffie')" },
          titel: { type: "string", description: "Nieuwe titel (optioneel, alleen als deze wijzigt)" },
          startDatum: { type: "string", description: "Nieuwe startdatum YYYY-MM-DD (optioneel)" },
          eindDatum: { type: "string", description: "Nieuwe einddatum YYYY-MM-DD (optioneel)" },
          startTijd: { type: "string", description: "Nieuwe starttijd HH:MM (optioneel)" },
          eindTijd: { type: "string", description: "Nieuwe eindtijd HH:MM (optioneel)" },
          heledag: { type: "boolean", description: "Hele dag event (optioneel)" },
          locatie: { type: "string", description: "Nieuwe locatie (optioneel)" },
          beschrijving: { type: "string", description: "Nieuwe beschrijving (optioneel)" },
        },
        required: ["zoekterm"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "uitgavenOverzicht",
      description: "Haal een volledig financieel overzicht op voor een specifieke maand. Toont inkomsten, uitgaven (exclusief interne overboekingen), netto resultaat, eindsaldo, categorie-verdeling, en top uitgaven. Gebruik dit als de gebruiker vraagt naar uitgaven, financieel overzicht, of kosten van een maand.",
      parameters: {
        type: "object",
        properties: {
          maand: { type: "number", description: "Maandnummer (1-12)" },
          jaar: { type: "number", description: "Jaar (default: huidig jaar)" },
          categorie: { type: "string", description: "Optioneel: filter op specifieke categorie", enum: ["Boodschappen", "Brandstof", "Coffeeshop", "Crypto", "Familie", "Fastfood", "Gaming", "Geldopname", "Interne Overboeking", "Online Winkelen", "Persoonlijk", "SaaS", "SaaS Abonnementen", "Salaris", "Sport", "Streaming", "Telecom", "Toeslagen", "Vakantie", "Vaste Lasten", "Vervoer", "Verzekeringen", "Vrienden", "Vrije Tijd", "Zakelijk", "Zorgverzekering"] },
          rekening: { type: "string", description: "Optioneel: filter op rekening ('betaal' of 'spaar')", enum: ["betaal", "spaar"] },
          top: { type: "number", description: "Aantal top uitgaven om te tonen (default 10)" },
        },
        required: ["maand"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "saldoOpvragen",
      description: "Haal het huidige saldo op van alle bankrekeningen. Toont saldo per rekening (betaal + spaar) en totaal. Gebruik dit als de gebruiker vraagt naar saldo, bankstand, hoeveel er op de rekening staat, of financieel overzicht wil.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "maandVergelijken",
      description: "Vergelijk de financiën van twee maanden side-by-side. Toont verschil in inkomsten, uitgaven en netto resultaat per categorie. Gebruik dit als de gebruiker vraagt 'geef ik meer uit', 'vergelijk februari met maart', of trends wil zien.",
      parameters: {
        type: "object",
        properties: {
          maand1: { type: "number", description: "Eerste maand (1-12)" },
          maand2: { type: "number", description: "Tweede maand (1-12)" },
          jaar1: { type: "number", description: "Jaar van eerste maand (default: huidig jaar)" },
          jaar2: { type: "number", description: "Jaar van tweede maand (default: zelfde als jaar1)" },
        },
        required: ["maand1", "maand2"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "vasteLastenAnalyse",
      description: "Analyseer terugkerende (vaste) uitgaven. Detecteert betalingen die in 3 of meer maanden voorkomen (abonnementen, verzekeringen, vaste lasten). Toont gemiddeld bedrag per maand en totaal. Gebruik dit als de gebruiker vraagt naar vaste lasten, abonnementen, terugkerende kosten, of maandelijkse verplichtingen.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "categorieWijzigen",
      description: "Wijzig de categorie van een enkele transactie. Zoek de transactie op basis van tegenpartij of omschrijving en ken een nieuwe categorie toe. Gebruik dit als de gebruiker een specifieke transactie wil herindelen.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Zoekterm om de transactie te vinden (tegenpartij of omschrijving)" },
          categorie: { type: "string", description: "Nieuwe categorie", enum: ["Boodschappen", "Brandstof", "Coffeeshop", "Crypto", "Familie", "Fastfood", "Gaming", "Geldopname", "Interne Overboeking", "Online Winkelen", "Persoonlijk", "SaaS", "SaaS Abonnementen", "Salaris", "Sport", "Streaming", "Telecom", "Toeslagen", "Vakantie", "Vaste Lasten", "Vervoer", "Verzekeringen", "Vrienden", "Vrije Tijd", "Zakelijk", "Zorgverzekering"] },
        },
        required: ["zoekterm", "categorie"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bulkCategoriseren",
      description: "Wijzig de categorie van ALLE transacties van een bepaalde tegenpartij in één keer. Gebruik dit als de gebruiker zegt 'label alle Texaco als Brandstof' of 'alle AH als Boodschappen'.",
      parameters: {
        type: "object",
        properties: {
          tegenpartij: { type: "string", description: "Naam van de tegenpartij (bijv. 'Texaco', 'Albert Heijn')" },
          categorie: { type: "string", description: "Nieuwe categorie", enum: ["Boodschappen", "Brandstof", "Coffeeshop", "Crypto", "Familie", "Fastfood", "Gaming", "Geldopname", "Interne Overboeking", "Online Winkelen", "Persoonlijk", "SaaS", "SaaS Abonnementen", "Salaris", "Sport", "Streaming", "Telecom", "Toeslagen", "Vakantie", "Vaste Lasten", "Vervoer", "Verzekeringen", "Vrienden", "Vrije Tijd", "Zakelijk", "Zorgverzekering"] },
        },
        required: ["tegenpartij", "categorie"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ongelabeldAnalyse",
      description: "Analyseer transacties zonder categorie. Toont patronen (gegroepeerd per tegenpartij), aantallen, en AI-suggesties voor categorieën. Gebruik dit als de gebruiker vraagt 'welke transacties missen een label', 'hoeveel zijn ongelabeld', of 'help me categoriseren'.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  // ──────────────── Notes tools ────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "notitieMaken",
      description: "Maak een nieuwe persoonlijke notitie aan. Gebruik dit als de gebruiker zegt 'schrijf op', 'noteer', 'onthoud', 'maak een notitie', of een boodschappenlijst dicteert.",
      parameters: {
        type: "object",
        properties: {
          inhoud:        { type: "string", description: "De tekst van de notitie. Gebruik '- [ ] item' syntax voor checklist items." },
          titel:         { type: "string", description: "Optionele korte titel voor de notitie" },
          tags:          { type: "array", items: { type: "string" }, description: "Optionele tags (bijv. ['boodschappen', 'werk'])" },
          deadline:      { type: "string", description: "ISO timestamp deadline (bijv. '2026-04-05T17:00:00'). Gebruik bij 'doe dit voor vrijdag', 'deadline morgen'." },
          linkedEventId: { type: "string", description: "eventId van een personalEvent om aan te koppelen. Gebruik bij 'koppel aan mijn afspraak'." },
          prioriteit:    { type: "string", enum: ["hoog", "normaal", "laag"], description: "Prioriteit. Gebruik 'hoog' bij 'urgent', 'belangrijk'. Default: 'normaal'." },
        },
        required: ["inhoud"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "notitiesZoeken",
      description: "Doorzoek persoonlijke notities op inhoud. Gebruik dit als de gebruiker vraagt 'wat had ik genoteerd over...', 'zoek in mijn notities', of 'heb ik een notitie over...'.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Zoekterm om in notities te zoeken" },
        },
        required: ["zoekterm"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "notitiePinnen",
      description: "Pin of unpin een notitie zodat deze bovenaan blijft staan. Gebruik dit als de gebruiker vraagt 'pin die notitie', 'maak deze belangrijk', of 'zet bovenaan'.",
      parameters: {
        type: "object",
        properties: {
          noteId: { type: "string", description: "Het ID van de notitie om te pinnen/unpinnen" },
        },
        required: ["noteId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "notitieBewerken",
      description: "Bewerk een bestaande notitie. Gebruik bij 'bewerk notitie', 'voeg toe aan notitie', 'wijzig deadline', 'koppel aan afspraak'. Zoek eerst met notitiesZoeken als je het ID niet hebt.",
      parameters: {
        type: "object",
        properties: {
          noteId:        { type: "string", description: "Het ID van de notitie" },
          inhoud:        { type: "string", description: "Nieuwe inhoud (vervangt volledig)" },
          titel:         { type: "string", description: "Nieuwe titel" },
          tags:          { type: "array", items: { type: "string" }, description: "Nieuwe tags" },
          deadline:      { type: "string", description: "Nieuwe deadline (ISO timestamp)" },
          linkedEventId: { type: "string", description: "Event ID om aan te koppelen" },
          prioriteit:    { type: "string", enum: ["hoog", "normaal", "laag"], description: "Nieuwe prioriteit" },
        },
        required: ["noteId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "notitieArchiveren",
      description: "Archiveer een notitie zodat deze niet meer in het overzicht staat. Gebruik bij 'klaar met notitie', 'archiveer', 'verwijder notitie' (we archiveren soft).",
      parameters: {
        type: "object",
        properties: {
          noteId: { type: "string", description: "Het ID van de notitie" },
        },
        required: ["noteId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "notitiesOverzicht",
      description: "Toon een overzicht van alle notities met optioneel filter. Gebruik bij 'mijn notities', 'welke deadlines heb ik', 'toon vastgezette notities', 'belangrijke notities'.",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "string", enum: ["recent", "pinned", "deadline", "hoog"], description: "Filter: recent (default), pinned (vastgezet), deadline (met deadline), hoog (hoge prioriteit)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bulkArchiveerNotities",
      description: "Archiveer meerdere notities tegelijk. Gebruik na triage-bevestiging wanneer de gebruiker zegt 'ja archiveer ze', 'ruim die notities op', of bevestigt na een triage-suggestie.",
      parameters: {
        type: "object",
        properties: {
          noteIds: { type: "array", items: { type: "string" }, description: "Array van notitie IDs om te archiveren" },
        },
        required: ["noteIds"],
      },
    },
  },
  // ──────────────── Habits tools ────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "habitAanmaken",
      description: "Maak een nieuwe habit/gewoonte aan. Gebruik dit als de gebruiker zegt 'ik wil dagelijks X doen', 'nieuwe habit', 'gewoonte toevoegen'. Stel slimme defaults in (emoji, moeilijkheid, frequentie).",
      parameters: {
        type: "object",
        properties: {
          naam:          { type: "string", description: "Naam van de habit (bijv. 'Gym', 'Water drinken', 'Geen fastfood')" },
          emoji:         { type: "string", description: "Passende emoji (bijv. '🏋️', '💧', '🚫')" },
          type:          { type: "string", enum: ["positief", "negatief"], description: "Positief (doen) of negatief (vermijden)" },
          frequentie:    { type: "string", enum: ["dagelijks", "weekdagen", "weekenddagen", "aangepast", "x_per_week", "x_per_maand"], description: "Hoe vaak" },
          moeilijkheid:  { type: "string", enum: ["makkelijk", "normaal", "moeilijk"], description: "XP multiplier: makkelijk=5, normaal=10, moeilijk=20" },
          beschrijving:  { type: "string", description: "Optionele beschrijving/doel" },
          roosterFilter: { type: "string", enum: ["alle", "werkdagen", "vrijeDagen", "vroegeDienst", "lateDienst"], description: "Koppel aan werkrooster (optioneel)" },
        },
        required: ["naam", "emoji", "type", "frequentie"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "habitVoltooien",
      description: "Markeer een habit als voltooid voor vandaag. Gebruik bij 'ik heb getraind', 'gym gedaan', 'water gedronken', 'check habit X'. Verdient XP en bouwt streak op.",
      parameters: {
        type: "object",
        properties: {
          habitNaam: { type: "string", description: "Naam (of deel van naam) van de habit om af te tikken (bijv. 'gym', 'water')" },
        },
        required: ["habitNaam"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "habitIncident",
      description: "Log een incident voor een negatieve habit (streak reset). Gebruik bij 'ik heb gerookt', 'toch fastfood gehad', 'terugval'. VRAAG ALTIJD naar de trigger/oorzaak.",
      parameters: {
        type: "object",
        properties: {
          habitNaam: { type: "string", description: "Naam van de negatieve habit" },
          trigger:   { type: "string", enum: ["mentale_overprikkeling", "fysieke_vermoeidheid", "stress_emotie", "vermijdingsgedrag", "sociale_druk", "anders"], description: "Oorzaak/trigger van het incident. Probeer ALTIJD te classificeren. Vraag de gebruiker als onduidelijk." },
          notitie:   { type: "string", description: "Optionele context/notitie bij het incident" },
        },
        required: ["habitNaam"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "habitsOverzicht",
      description: "Toon alle habits met streaks, XP en dagelijkse status. Gebruik bij 'mijn habits', 'welke habits heb ik', 'habit overzicht'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "habitStreaks",
      description: "Toon streak overzicht van alle habits. Gebruik bij 'mijn streaks', 'hoe lang al', 'streak status'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "habitBadges",
      description: "Toon behaalde badges/achievements en level info. Gebruik bij 'mijn badges', 'welk level ben ik', 'achievements'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "habitRapport",
      description: "Genereer een samenvattend habit rapport. Gebruik bij 'habit rapport', 'hoe gaat het met mijn habits', 'weekoverzicht habits'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "habitNotitie",
      description: "Voeg een notitie toe aan een habit. Gebruik bij 'noteer bij gym: ...', 'habit notitie'.",
      parameters: {
        type: "object",
        properties: {
          habitNaam: { type: "string", description: "Naam van de habit" },
          notitie:   { type: "string", description: "Notitie tekst" },
        },
        required: ["habitNaam", "notitie"],
      },
    },
  },
];

