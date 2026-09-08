# @bos/meldekopf

Fremde Erfassungsbögen unter einem Einsatz sammeln — der Apparat hinter der
Meldekopf-Sicht.

Dieses Repository ist **kein eigenständiges Produkt**, sondern hängt als
git-Submodul unter `vendor/bos-meldekopf` in zwei Produkten:

- **einheitenerfassungsbogen** — PWA mit Capacitor und Electron, gebaut mit Vite
- **S1-Control v2** — Electron-Anwendung mit npm-Workspaces

Beide binden das Paket über `"@bos/meldekopf": "file:vendor/bos-meldekopf"` ein.

## Inhalt

| Modul | Was |
|---|---|
| `einsaetze` | die Sammlung: Revisionen stapeln, Zuordnung per Fingerabdruck, Idempotenz über den Inhalts-Hash, Papierkorb- und Aufräumfristen |
| `aufteilen` | eine Meldung in zwei zählende Einheiten trennen, ohne Stärke zu verlieren |
| `zusammenfuehren` | die Gegenrichtung |
| `meldung-diff` | was sich zwischen zwei Fassungen einer Meldung geändert hat |
| `papierkorb` | 30 Tage wiederherstellbar, danach endgültig |
| `darstellung` | Bogeninhalte als Text, wie sie auf dem Papierbogen stehen |

Zwei Rollen nutzen denselben Mechanismus, nur in anderem Kontext: der
Zug-/Verbandsführer sammelt die Bögen seiner Einheiten und leitet sie weiter,
der Meldekopf sammelt terminal und wertet aus.

## Die Ablage wird hineingereicht

Die Sammlung greift auf kein Global zu — weder `localStorage` noch sonst etwas
Plattformgebundenes (ADR-003, Aufnahmeregel 2). Sie bekommt eine Hülle mit
genau zwei Methoden:

```js
import { speicherhuelleSetzen, einsatzAnlegen, EinsatzArt } from "@bos/meldekopf";

speicherhuelleSetzen(localStorage);          // Erfassungsbogen
speicherhuelleSetzen(meinEreignisSpeicher);  // S1-Control
einsatzAnlegen("Hochwasser Hunte", EinsatzArt.EINSATZ, "Oldenburg");
```

Ohne Aufruf arbeitet die Sammlung speicherlos: Listen bleiben leer,
Schreibvorgänge verpuffen. Das ist absichtlich dasselbe Verhalten, das ein
blockierter Browser-Speicher (Privatmodus) schon immer hatte — kein Absturz,
sondern eine App ohne gespeicherte Einsätze.

## Warum die Kern-Bausteine peerDependencies sind

`@bos/eeb-format` und `@bos/vokabulare` sind `peerDependency`, nicht
`dependency`. Läge das Format ein zweites Mal im Baum, sähe TypeScript zwei
verschiedene Typen gleichen Namens; die Fehlermeldung nennt zweimal denselben
Namen und die Ursache steht in keinem Stapelabzug (ADR-003, Nachtrag „Diamant
auf eeb-format"). Das Produkt liefert die eine Kopie. Zur Entwicklung hier sind
beide zusätzlich als `devDependency` auf `file:../…` verdrahtet.

## Aufnahmeregeln (ADR-003)

1. Aufnahme nur, wenn beide Produkte den Baustein aufrufen.
2. Keine `node:`-, DOM- oder React-Importe; geprüft per ESLint und durch Testlauf unter `node` und `jsdom`.
3. Keine Rückimporte aus `@s1/*` oder aus der Erfassungsbogen-App.
4. Änderungen additiv; Schema-Abwärtskompatibilität bleibt Pflicht.
5. Bundle-Budget im CI von erfassungsbogen.app; der Kern darf die PWA nicht schwerer machen.
6. Gepinnte Submodul-Commits; kein automatisches Folgen von `main`.

Regel 2 und 3 sind maschinell hinterlegt: `eslint.config.mjs` verbietet die
Importe, `tsconfig.json` lässt `"DOM"` aus `lib` und setzt `"types": []`,
`vitest.config.ts` fährt dieselben Testdateien unter `node` und unter `jsdom`.

Eine Ausnahme steht in `src/plattform.d.ts`: `crypto.randomUUID()` gibt es in
jeder Zielumgebung, seinen Typ aber nur über `lib.dom` oder `@types/node`.
Deklariert ist nur der eine Aufruf, und zwar als optional — im unsicheren
Kontext fehlt er tatsächlich, dann fällt die Sammlung auf Zeitstempel plus
Zufallszahl zurück.

## Lokal bauen und prüfen

Voraussetzung: Node 24 (siehe `.nvmrc`), `eeb-format` und `bos-vokabulare` als
Nachbarordner.

```bash
npm install
npm run build
npm run typecheck
npm run lint
npm test
```

Das Paket trägt bewusst **kein `prepare`-Skript**: npm ordnet die Läufe von
`file:`-Abhängigkeiten nicht nach der Peer-Beziehung, und führt Install-Skripte
inzwischen ohnehin nicht mehr ungefragt aus. Wer `dist/` braucht, baut
ausdrücklich und in der Reihenfolge eeb-format → vokabulare →
taktische-zeichen → meldekopf. Ausführlich im README von eeb-format.

## Lizenz

EUPL-1.2
