/**
 * `@bos/meldekopf` — fremde Erfassungsbögen unter einem Einsatz sammeln.
 *
 * Zwei Rollen nutzen denselben Mechanismus: der Zug-/Verbandsführer sammelt
 * die Bögen seiner Einheiten und leitet sie weiter, der Meldekopf sammelt
 * terminal und wertet aus.
 *
 *   einsaetze        die Sammlung selbst: Revisionen stapeln, Zuordnung per
 *                    Fingerabdruck, Idempotenz über den Inhalts-Hash
 *   aufteilen        eine Meldung in zwei zählende Einheiten trennen
 *   zusammenfuehren  die Gegenrichtung
 *   meldung-diff     was sich zwischen zwei Fassungen geändert hat
 *   papierkorb       30 Tage wiederherstellbar, danach endgültig
 *   darstellung      Bogeninhalte als Text, wie sie auf dem Papierbogen stehen
 *
 * Die Ablage wird hineingereicht (`speicherhuelleSetzen`), nicht hier gewählt:
 * im Erfassungsbogen `localStorage`, in S1-Control dessen Ereignis-Speicher.
 *
 * `@bos/eeb-format` und `@bos/vokabulare` sind peerDependencies — das Format
 * muss im Baum genau einmal liegen, sonst sieht TypeScript zwei verschiedene
 * Typen gleichen Namens (ADR-003, Nachtrag „Diamant auf eeb-format").
 */

export * from "./einsaetze.js";
export * from "./aufteilen.js";
export * from "./zusammenfuehren.js";
export * from "./meldung-diff.js";
export * from "./papierkorb.js";
export * from "./darstellung.js";
