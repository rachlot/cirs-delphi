# CIRS-Kategorien Delphi-Tool

Web-Anwendung zur Konsentierung eines CIRS-Kategoriensystems durch ein Expertengremium
über mehrere Delphi-Runden hinweg, gemäß dem Lastenheft von Dr. Carlos Hölzing
(MedFlow Systems).

Kernfunktionen: einfache Klick-Auswahl der (aktuell 22) Hauptkategorien aus der
Seed-Taxonomie, eigene (private) Kategorien, Bewertung jeder ausgewählten Kategorie auf
einer 1–9-Wichtigkeits-/Sicherheitsskala (RAND/UCLA-Standard) inkl. optionalem
Kommentar, mehrstufiges Rundenverfahren mit kompakter Rückmeldung aus der Vorrunde,
Organisations-Bereich mit Median-/IQR-Auswertung sowie CSV- und JSON-Export.

Das System wurde bewusst sehr einfach gehalten (schnelle, intuitive Zuordnung für alle
Teilnehmenden, klar auswertbar für die Organisation): keine Baum-/Hierarchie-Struktur,
nur Hauptkategorien anklicken bzw. eigene ergänzen und mit einer Zahl von 1 bis 9
bewerten.

## Tech-Stack

- **Next.js 15** (App Router, TypeScript) – Frontend & Backend in einer Anwendung
- **PostgreSQL** – persistente Datenhaltung
- **Drizzle ORM** – typsicherer Datenbankzugriff, SQL-Migrationen unter `drizzle/`
- **Tailwind CSS** – Styling

Es wird bewusst **kein Prisma** verwendet: Prisma lädt seine Datenbank-Engines von
`binaries.prisma.sh` nach, was in manchen Firmen-/Cloud-Netzwerken durch Egress-Regeln
blockiert ist. Drizzle ist reines TypeScript ohne native Nachladeschritte und lässt sich
in jeder Umgebung zuverlässig bauen.

## Lokale Entwicklung

Voraussetzungen: Node.js ≥ 20, PostgreSQL ≥ 14.

```bash
cp .env.example .env
# .env anpassen: DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET

npm install
npm run db:migrate   # legt die Tabellen an
npm run db:seed       # legt Runde 1 mit der Seed-Taxonomie aus dem Lastenheft an
npm run dev
```

Anwendung läuft danach auf `http://localhost:3000`. Der Organisations-Bereich ist unter
`/admin` erreichbar (Passwort aus `ADMIN_PASSWORD`). Nach dem Seed liegt Runde 1 im
Status „Entwurf" – im Dashboard auf „Offen" setzen, um den Einladungslink für
Teilnehmende freizuschalten.

### Nützliche Skripte

| Skript              | Zweck                                                        |
|----------------------|---------------------------------------------------------------|
| `npm run dev`        | Entwicklungsserver                                            |
| `npm run build`      | Produktions-Build                                             |
| `npm run start`      | Produktions-Server (nach `build`)                              |
| `npm run db:generate`| Neue SQL-Migration aus Schemaänderungen (`src/db/schema.ts`) erzeugen |
| `npm run db:migrate` | Migrationen auf die Datenbank anwenden                          |
| `npm run db:seed`    | Seed-Taxonomie + Runde 1 anlegen (nur wenn DB leer ist)         |
| `npm run db:studio`  | Drizzle Studio – grafischer Datenbank-Browser                  |

## Projektstruktur (Kurzüberblick)

```
src/
  db/               Datenbankschema, Verbindung, Seed-Skript, Seed-Taxonomie
  lib/              Geschäftslogik: Auth, Validierung, Bewertungslisten-Utilities, Aggregation (Median/IQR), Export
  actions/          Next.js Server Actions (Einreichung, Admin-Funktionen)
  components/       React-Komponenten (Bewertungs-Editor, Admin-UI, Formulare)
  app/
    runde/[token]/  Teilnehmer-Ansicht (Identifikation + Auswahl/Bewertung)
    admin/          Organisations-Bereich (Login, Dashboard, Runden, Einstellungen)
    api/admin/export/  CSV-/JSON-Export als Route Handler
drizzle/            Generierte SQL-Migrationen (versioniert, in Produktion ausführen)
```

## Datenmodell (Kurzfassung)

- **categories** – gemeinsamer, von der Organisation kuratierter Kategorien-Pool
  (Seed-Taxonomie + im Lauf der Runden freigegebene Teilnehmer-Vorschläge)
- **rounds** – Runden mit Status (`draft`/`open`/`closed`), Einladungs-Token und der
  kompakten Rückmeldung an Teilnehmende (`feedback_summary`)
- **round_categories** – welcher Kategorien-Pool in welcher Runde zur Verfügung steht
- **participants** – Name, E-Mail (eindeutig), optional Berufsgruppe/Einrichtung
- **submissions** – eine Einreichung je Teilnehmer:in und Runde
- **ratings** – die flache Auswahl- und Bewertungsliste je Einreichung: pro
  ausgewählter Kategorie (Pool- oder private Freitext-Kategorie) eine
  Wichtigkeits-/Sicherheitsbewertung (1–9, RAND/UCLA-Skala) plus optionalem
  Kommentar. Bewusst keine Baum-/Eltern-Kind-Hierarchie mehr.

## Funktionsweise des Rundenverfahrens

1. **Runde 1**: Die Seed-Taxonomie aus dem Lastenheft (aktuell nur die 22
   Hauptkategorien) ist der Ausgangspool. Teilnehmende klicken die für sie relevanten
   Kategorien einfach an, um sie in ihre persönliche Auswahlliste zu übernehmen, können
   eigene (nur für sie sichtbare) Kategorien ergänzen, und bewerten jede ausgewählte
   Kategorie auf einer 1–9-Skala nach Wichtigkeit/Sicherheitsrelevanz (RAND/UCLA-
   Appropriateness-Method-Standard) – optional mit Kommentar. Es gibt keine
   Baum-/Hierarchie-Struktur mehr; das macht die Zuordnung für jede:n Teilnehmer:in
   schnell und intuitiv.
2. **Auswertung**: Im Organisations-Bereich zeigt die Auswertungsansicht je Kategorie
   Anzahl der Bewertungen (n), Median, Mittelwert, Quartile (Q1/Q3) und
   Interquartilsabstand (IQR), sowie ob nach dem konfigurierten Kriterium bereits Konsens
   erreicht ist. Zusätzlich werden alle neu vorgeschlagenen eigenen Kategorien mit ihrer
   Bewertungsstatistik gelistet, und alle Kommentare je Kategorie gebündelt.
3. **Nächste Runde erstellen**: Aus der Auswertung einer Runde heraus legt die
   Organisation die Folgerunde an. Der Kategorien-Pool wird automatisch übernommen;
   einzelne Teilnehmer-Vorschläge können gezielt in den gemeinsamen Pool aufgenommen
   werden. Die Rückmeldung an Teilnehmende (Zahlen + Kurztext, z.B. „Median-Bewertung: 7
   von 9 (IQR 2, 12 Bewertungen)") wird automatisch aus den Daten der Vorrunde
   vorgeschlagen und ist vor dem Anlegen editierbar (Hinweistext,
   „kontrovers"-Markierung; vorbelegt für Kategorien mit IQR über dem Konsenskriterium).
4. **Konsenskriterium & maximale Rundenzahl** sind unter „Einstellungen" konfigurierbar.
   Das Konsenskriterium ist der maximale Interquartilsabstand (IQR) der 1–9-Bewertungen,
   ab dem eine Kategorie als „Konsens erreicht" gilt (RAND/UCLA-Standard, üblich: 2–3).
   Das Erreichen des Kriteriums beendet das Verfahren **nicht automatisch** – die
   Entscheidung, eine weitere Runde anzulegen oder das Verfahren zu beenden, bleibt
   bewusst bei der Organisation.
5. Teilnehmende identifizieren sich vor jeder Einreichung mit Name und E-Mail
   (Pflichtfelder). Über die E-Mail-Adresse werden sie über Runden hinweg wiedererkannt.
   Ein einfacher Einladungslink pro Runde genügt; ein separates Login-System ist nicht
   erforderlich.

## Deployment

Für den produktiven Einsatz werden zwei gleichwertige Wege empfohlen. Beide erfüllen
die im Lastenheft geforderte EU-Datenhaltung, wenn die jeweilige Region korrekt gewählt
wird.

### Option N – Netlify + Supabase (aktuelles Produktions-Setup)

Die Konfiguration liegt in `netlify.toml`. Netlify erkennt Next.js automatisch; der
Build-Befehl wendet vorher die Migrationen auf `DATABASE_URL` an. Runde 1 und die
Seed-Taxonomie entstehen beim ersten Aufruf des Admin-Dashboards
(`seedIfEmpty` in `src/db/seed-data.ts`).

- **Datenbank**: Supabase-Projekt in Frankfurt (`eu-central-1`). Als `DATABASE_URL` den
  Session-Pooler-String (`…pooler.supabase.com:5432`) verwenden, mit
  `?uselibpqcompat=true&sslmode=require`: Supabase signiert mit einer eigenen CA, die
  Node nicht kennt; so ist die Verbindung verschlüsselt, ohne dass die CA hinterlegt
  werden muss.
- **Row Level Security**: Migration `0001_enable_rls.sql` schaltet RLS auf allen Tabellen
  ein (ohne Policies). Damit sind die Daten über die öffentliche Supabase-REST-API nicht
  lesbar; die App verbindet sich als Tabellenbesitzer und ist nicht betroffen.
- **Umgebungsvariablen** in Netlify: `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
  `NEXT_PUBLIC_APP_URL` ist optional; ohne sie nutzen die Einladungslinks die
  Netlify-URL der Site.

### Option A – Vercel + verwaltete Postgres-Datenbank (am wenigsten Wartungsaufwand)

1. Repository zu GitHub/GitLab pushen, Projekt in [vercel.com](https://vercel.com) importieren.
2. Region auf Frankfurt (`fra1`) stellen (Vercel Projekteinstellungen → Functions → Region).
3. Managed Postgres in einer EU-Region anlegen, z.B. Supabase (Region `eu-central-1`,
   Frankfurt) oder Neon (Region `Europe – Frankfurt`). Connection-String übernehmen.
4. Umgebungsvariablen in Vercel setzen (siehe unten).
5. Vor dem ersten Start einmalig Migrationen ausführen: `npm run db:migrate` (lokal mit
   der Produktions-`DATABASE_URL`, oder über einen einmaligen Vercel-Build-Hook/CI-Schritt)
   sowie `npm run db:seed`.
6. Deploy auslösen.

### Option B – Self-Hosting auf einem EU-VPS (volle Kontrolle über den Serverstandort)

1. Server bei einem EU-Anbieter mit AV-Vertrag (z.B. Hetzner, IONOS, netcup – Standort
   Deutschland/EU) aufsetzen.
2. Node.js ≥ 20 und PostgreSQL ≥ 14 installieren (oder PostgreSQL als separaten
   verwalteten Dienst desselben Anbieters nutzen).
3. Repository auf den Server bringen, `npm install && npm run build`.
4. `npm run db:migrate && npm run db:seed` einmalig ausführen.
5. `npm run start` z.B. über `systemd` oder `pm2` dauerhaft laufen lassen, dahinter
   einen Reverse Proxy (nginx/Caddy) mit TLS-Zertifikat (Let's Encrypt) betreiben.
6. Regelmäßige verschlüsselte Backups der Postgres-Datenbank einrichten.

### Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | Postgres-Verbindungsstring |
| `ADMIN_PASSWORD` | Passwort für den Organisations-Bereich (`/admin`) – **vor Produktivbetrieb unbedingt ändern** |
| `SESSION_SECRET` | Zufälliger, langer String zum Signieren des Admin-Session-Cookies |
| `NEXT_PUBLIC_APP_URL` | Öffentliche Basis-URL der Anwendung (wird für die Anzeige der Einladungslinks verwendet) |

## Datenschutz (DSGVO) – Hinweise für den Betrieb

Diese Anwendung speichert personenbezogene Daten (Name, E-Mail-Adresse, optional
Berufsgruppe/Einrichtung) sowie die inhaltlichen Einreichungen der Teilnehmenden. Für
den produktiven Einsatz in einem gesundheitsnahen Kontext sind insbesondere folgende
Punkte zu berücksichtigen – die konkrete rechtliche Bewertung sollte durch die
Datenschutzbeauftragte/den Datenschutzbeauftragten von MedFlow Systems erfolgen, diese
Hinweise ersetzen keine Rechtsberatung:

- **Serverstandort EU**: Bei Wahl von Hosting- und Datenbank-Anbieter auf eine
  EU-Region achten (siehe Deployment-Optionen oben).
- **Auftragsverarbeitungsvertrag (AVV)**: Mit dem Hosting-/Datenbank-Anbieter ist ein
  AVV gemäß Art. 28 DSGVO abzuschließen.
- **Verschlüsselung**: Übertragung ausschließlich über TLS (durch Vercel bzw. den
  Reverse Proxy sichergestellt); Verschlüsselung der Datenbank „at rest" ist bei den
  genannten Anbietern Standard bzw. konfigurierbar – bitte in den jeweiligen
  Anbieter-Einstellungen aktivieren.
- **Zugriffskonzept**: Der Organisations-Bereich ist aktuell durch ein einzelnes
  gemeinsames Passwort geschützt (kein individuelles Nutzerkonto). Das reicht für ein
  kleines Organisationsteam; bei mehreren Organisator:innen mit unterschiedlichen
  Rechten müsste ein feingranulareres Nutzerkonzept ergänzt werden.
- **Löschkonzept**: Es gibt aktuell keine automatische Lösung nach Ablauf einer Frist.
  Empfehlung: Nach Abschluss des gesamten Delphi-Verfahrens die Teilnehmerdaten
  (`participants`-Tabelle bzw. die E-Mail-/Namensfelder) gemäß der im Vorfeld
  festgelegten Aufbewahrungsfrist löschen oder pseudonymisieren. Dies lässt sich über
  `npm run db:studio` oder ein einfaches SQL-Skript umsetzen.
- **Datenminimierung**: Es werden nur die im Lastenheft geforderten Felder erhoben.
  Auf dem Identifikations-Formular steht ein kurzer Hinweistext; ein vollständiger
  Datenschutzhinweis/Einwilligungstext (Verlinkung auf die Datenschutzerklärung von
  MedFlow Systems) sollte vor dem Produktivstart ergänzt werden.

## Bekannte Einschränkungen & offene Punkte

Die folgenden Punkte waren im Lastenheft nicht abschließend spezifiziert; hier
getroffene Annahmen sind leicht anpassbar:

- **Aktuell nur Hauptkategorien, keine Baum-Struktur**: Auf ausdrücklichen Wunsch enthält
  die Seed-Taxonomie (`src/db/taxonomy-seed-data.ts`) nur die 16 Hauptkategorien aus dem
  Lastenheft plus sechs nachträglich ergänzte (Prozessstörung, Arbeitssicherheit, Material,
  Logistik, Patientenunfall, Klinische Administration), keine Unterkategorien. Das Datenmodell wurde bewusst von einem
  Drag-&-Drop-Baum-Editor auf eine flache Auswahl-/Bewertungsliste umgestellt
  (Klick-Auswahl + eigene Kategorien + 1–9-Bewertung), um die Zuordnung für alle
  Teilnehmenden so einfach und schnell wie möglich zu machen und die Auswertung für die
  Organisation eindeutig zu halten. Sollten später doch Unterkategorien gewünscht sein,
  wäre das ein bewusster, erneuter Rückbau zu einer Hierarchie – bitte bei Bedarf explizit
  ansprechen.
- **WHO-ICPS-Kennzeichnung korrigiert**: Im Lastenheft-Text waren nur 5 Hauptkategorien
  inline mit „(WHO ICPS)" markiert. Ein Abgleich mit der offiziellen WHO-Klassifikation
  (WHO 2010, "The Conceptual Framework for the International Classification for Patient
  Safety" – https://www.who.int/publications/i/item/WHO-IER-PSP-2010.2) ergab: Die dortige
  "Incident Type"-Klasse umfasst 12 Kategorien (Clinical process, Documentation,
  Healthcare-associated infection, Medication, Blood, Nutrition, Oxygen, Medical device,
  Behaviour, Patient accidents, Infrastructure, Resources). Danach gehören tatsächlich 10
  der 16 Hauptkategorien dazu – u.a. auch "Klinischer Prozess", "Dokumentation",
  "Medikation", "Blut", "Medizinprodukte" und "Personengefährdung/Patientensicherheit", die
  im Lastenheft-Text nicht markiert waren; "IT-Systeme" gehört umgekehrt NICHT zur
  offiziellen WHO-Klassifikation, war im Lastenheft aber markiert. Die App folgt jetzt der
  offiziellen Klassifikation (siehe Kommentare in `taxonomy-seed-data.ts`) – bitte prüfen
  und bei Bedarf anpassen, falls eine andere WHO-ICPS-Fassung zugrunde gelegt werden soll.
- **Rückmeldung an Teilnehmende**: Als „Zahlen + Kurztext" umgesetzt (gemäß
  Rückfrage-Klärung), nicht als Diagramm. Eine grafische Darstellung ließe sich später
  ergänzen (z.B. in `FeedbackPanel.tsx`).
- **Admin-Zugriff**: Ein gemeinsames Passwort statt individueller Konten (siehe oben).
- **Konsenskriterium nach RAND/UCLA**: Konsens gilt je Kategorie als erreicht, wenn der
  Interquartilsabstand (IQR) der 1–9-Bewertungen kleiner oder gleich dem in den
  Einstellungen konfigurierten Schwellenwert ist (Standardvorschlag: 2). Die Quartile
  werden per linearer Interpolation berechnet (verbreiteter Standard, siehe
  `src/lib/aggregation.ts`); andere Quartils-Konventionen sind möglich, falls die
  Organisation eine bestimmte Fachliteratur-Variante vorgibt. Das Erreichen des
  Kriteriums beendet das Verfahren bewusst **nicht automatisch**.
- **Rating-Skala**: 1–9 gemäß RAND/UCLA Appropriateness Method (Quelle:
  RAND/UCLA Appropriateness Method User's Manual,
  https://www.rand.org/content/dam/rand/pubs/tools/TLA3000/TLA3082-1/RAND_TLA3082-1.pdf).
  Die Skalenbeschriftung ("niedrige" bis "sehr hohe Wichtigkeit/Sicherheitsrelevanz")
  kann bei Bedarf in `TreeNodeView.tsx` (Komponente `RatingRow`) angepasst werden.

## Tests

Der Kernablauf (Identifikation → Kategorien anklicken → eigene Kategorie ergänzen →
1–9 bewerten → Kommentar → Einreichen → Admin-Auswertung mit Median/IQR →
Rundenerstellung → CSV-/JSON-Export) wurde während der Entwicklung mit Playwright
end-to-end durchgetestet. Playwright ist kein Teil der ausgelieferten Abhängigkeiten;
bei Bedarf lässt es sich mit `npm install -D @playwright/test` ergänzen (der Browser
selbst muss ggf. separat installiert werden, z.B. `npx playwright install chromium`).
