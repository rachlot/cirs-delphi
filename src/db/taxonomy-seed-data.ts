// Bereinigte Seed-Taxonomie aus dem Lastenheft, Abschnitt 8.
// Dies ist der Ausgangs-Kategorienbaum für Runde 1 - der Startzustand, nicht das Endergebnis.
//
// Stand jetzt: NUR Hauptkategorien (auf Wunsch des Auftraggebers) - Unterkategorien sind
// vorerst bewusst nicht enthalten, um das System für Runde 1 einfach und schnell zuordenbar
// zu halten. Die 16 Hauptkategorien entsprechen exakt Reihenfolge und Benennung aus dem
// Lastenheft, Abschnitt 8.
//
// "whoIcps"-Kennzeichnung: Im Lastenheft selbst waren nur 5 Hauptkategorien inline mit
// "(WHO ICPS)" markiert (IT-Systeme, Infrastruktur, Ressourcen/Organisation, Nosokomiale
// Infektion, Ernährung & Gase). Ein Abgleich mit der offiziellen WHO-Klassifikation ("The
// Conceptual Framework for the International Classification for Patient Safety", WHO 2010 -
// https://www.who.int/publications/i/item/WHO-IER-PSP-2010.2) zeigt: Die dortige "Incident
// Type"-Klasse umfasst genau 12 Kategorien: Clinical process, Documentation,
// Healthcare-associated infection, Medication, Blood, Nutrition, Oxygen, Medical device,
// Behaviour, Patient accidents, Infrastructure, Resources. "IT-Systeme" gehört demnach NICHT
// zur offiziellen WHO-ICPS-Klassifikation (vermutlich aus einem anderen CIRS-System
// übernommen), während "Klinischer Prozess", "Dokumentation", "Medikation", "Blut",
// "Medizinprodukte" und "Personengefährdung/Patientensicherheit" (Patient accidents +
// Behaviour) tatsächlich dazugehören, im Lastenheft-Text aber nicht markiert waren.
//
// Die Flags unten folgen daher der offiziellen WHO-Klassifikation statt der Lastenheft-Markierung.
// Bitte prüfen und bei Bedarf anpassen, falls eine andere WHO-ICPS-Version zugrunde liegen soll.

export interface SeedCategory {
  name: string;
  whoIcps?: boolean;
}

export const SEED_TAXONOMY: SeedCategory[] = [
  { name: "Klinischer Prozess / Patientenversorgung (Behandlung, Therapie/Pflege)", whoIcps: true }, // WHO ICPS: "Clinical process"
  { name: "Dokumentation", whoIcps: true }, // WHO ICPS: "Documentation"
  { name: "Medikation / Infusionslösungen", whoIcps: true }, // WHO ICPS: "Medication"
  { name: "Blut / Blutprodukte", whoIcps: true }, // WHO ICPS: "Blood"
  { name: "Medizinprodukte / Geräte", whoIcps: true }, // WHO ICPS: "Medical device"
  { name: "Informationstechnologie (IT-Systeme)", whoIcps: false }, // nicht Teil der offiziellen ICPS-Klassifikation
  { name: "Kommunikation", whoIcps: false },
  { name: "Infrastruktur / Gebäude / Einrichtung", whoIcps: true }, // WHO ICPS: "Infrastructure"
  { name: "Ressourcen / Organisation / Management", whoIcps: true }, // WHO ICPS: "Resources"
  { name: "Personengefährdung / Patientensicherheit", whoIcps: true }, // WHO ICPS: "Patient accidents" / "Behaviour"
  { name: "Nosokomiale Infektion", whoIcps: true }, // WHO ICPS: "Healthcare-associated infection"
  { name: "Probe / Labormanagement (Diagnostik/Präanalytik)", whoIcps: false },
  { name: "Ernährung & medizinische Gase", whoIcps: true }, // WHO ICPS: "Nutrition" + "Oxygen"
  { name: "Verwechslung", whoIcps: false },
  { name: "Datenschutz & Compliance", whoIcps: false },
  { name: "Sonstiges", whoIcps: false },
];
