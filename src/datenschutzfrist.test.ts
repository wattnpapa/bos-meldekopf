import { describe, it, expect, beforeEach } from "vitest";
import {
  ANONYM_BEZEICHNUNG,
  Ernaehrung,
  Fahrerlaubnis,
  Geschlecht,
  MINUTEN_JE_TAG,
  OrganisationsTyp,
  PersonalErfassung,
  SCHEMA_VERSION,
  StaerkeRolle,
  bogenAnonymisiert,
  type Erfassungsbogen,
  type Person,
} from "@bos/eeb-format";
import {
  EinsatzArt,
  MeldeStatus,
  bogenInhaltsId,
  datenschutzUhrSetzen,
  einsaetzeLaden,
  einsaetzeSpeichern,
  einsatzAnlegen,
  einsatzImportieren,
  eintragNachFrist,
  fristBereinigt,
  meldungHinzufuegen,
  speicherhuelleSetzen,
  type Einsatzsammlung,
  type MeldeEintrag,
  type Speicherhuelle,
} from "./einsaetze.js";

class MemStorage implements Speicherhuelle {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

const TAG = MINUTEN_JE_TAG;
const STAND = 2000 * TAG;
const NACH_FRIST = STAND + 91 * TAG;
const IN_FRIST = STAND + 30 * TAG;

let speicher: MemStorage;

beforeEach(() => {
  speicher = new MemStorage();
  speicherhuelleSetzen(speicher);
  datenschutzUhrSetzen(null);
});

function person(nachname: string, rolle: StaerkeRolle): Person {
  return {
    vorname: "Anna",
    nachname,
    staerkeRolle: rolle,
    funktionen: [{ code: 3 }],
    fahrerlaubnis: Fahrerlaubnis.B,
    geschlecht: Geschlecht.W,
    ernaehrung: Ernaehrung.FLEISCH,
    kontakte: [],
    zusatzqualifikationen: [],
  };
}

function bogen(over: Partial<Erfassungsbogen> = {}): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    stand: STAND,
    einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { code: 1 }, hierarchie: [{ bezeichnung: { code: 1 }, name: "OV Oldenburg" }] },
    einsatz: { zeitraumVon: 2000, zeitraumBis: 2001, ortAuftrag: "Hochwasser" },
    personalErfassung: PersonalErfassung.VOLLSTAENDIG,
    personal: [person("Berger", StaerkeRolle.UNTERFUEHRER), person("Ahlers", StaerkeRolle.MANNSCHAFT)],
    fahrzeuge: [],
    ...over,
  };
}

function eintrag(b: Erfassungsbogen, over: Partial<MeldeEintrag> = {}): MeldeEintrag {
  return {
    id: bogenInhaltsId(b),
    einheitSchluessel: "org:1||c1|ov oldenburg",
    empfangenAm: 1,
    quelle: "scan",
    status: MeldeStatus.ANWESEND,
    signatur: { zustand: "gueltig", pubkey: "ab", kurzform: "AB", absender: { name: "Anna Berger", telefon: "0171" } },
    herkunft: "RUVCMk…",
    bogen: b,
    ...over,
  };
}

/** `geaendert` frisch, sonst räumt schon die Aufräumfrist ruhender Sammlungen sie weg. */
function sammlung(eintraege: MeldeEintrag[], geaendert = Date.now()): Einsatzsammlung {
  return { id: "s1", name: "Hochwasser", art: EinsatzArt.EINSATZ, angelegt: geaendert, geaendert, eintraege };
}

describe("eintragNachFrist()", () => {
  it("lässt Meldungen in der Frist unangetastet", () => {
    const e = eintrag(bogen());
    expect(eintragNachFrist(e, IN_FRIST)).toBe(e);
  });

  it("lässt Übungsbögen auch nach Jahren unangetastet", () => {
    const e = eintrag(bogen({ uebung: true }));
    expect(eintragNachFrist(e, STAND + 5000 * TAG)).toBe(e);
  });

  it("anonymisiert abgelaufene Meldungen und entfernt Rohpayload und Signatur samt Absender", () => {
    const neu = eintragNachFrist(eintrag(bogen()), NACH_FRIST);
    expect(neu.bogen).toEqual(bogenAnonymisiert(bogen()));
    expect(neu.id).toBe(bogenInhaltsId(neu.bogen));
    expect(neu.herkunft).toBeUndefined();
    expect(neu.signatur).toBeUndefined();
    expect(JSON.stringify(neu)).not.toMatch(/Anna|Berger|Ahlers|0171|RUVCMk/);
    expect(neu.status).toBe(MeldeStatus.ANWESEND);
  });

  it("gibt eine schon anonymisierte Meldung unverändert zurück", () => {
    const einmal = eintragNachFrist(eintrag(bogen()), NACH_FRIST);
    expect(eintragNachFrist(einmal, NACH_FRIST)).toBe(einmal);
  });
});

describe("fristBereinigt()", () => {
  it("zählt die anonymisierten Meldungen und lässt die Aufräumfrist der Sammlung in Ruhe", () => {
    const r = fristBereinigt([sammlung([eintrag(bogen()), eintrag(bogen({ uebung: true }))], 7)], NACH_FRIST);
    expect(r.anonymisiert).toBe(1);
    expect(r.liste[0]!.geaendert).toBe(7);
    expect(r.liste[0]!.eintraege).toHaveLength(2);
  });

  it("gibt dieselbe Sammlung zurück, wenn nichts abgelaufen ist", () => {
    const s = sammlung([eintrag(bogen())]);
    expect(fristBereinigt([s], IN_FRIST).liste[0]).toBe(s);
  });

  it("führt Fassungen zusammen, die sich nur in den Namen unterschieden", () => {
    const a = eintrag(bogen());
    const b = eintrag(bogen({ personal: [person("Meyer", StaerkeRolle.UNTERFUEHRER), person("Ahlers", StaerkeRolle.MANNSCHAFT)] }), {
      empfangenAm: 2,
    });
    const r = fristBereinigt([sammlung([a, b])], NACH_FRIST);
    expect(r.liste[0]!.eintraege).toHaveLength(1);
    expect(r.liste[0]!.eintraege[0]!.empfangenAm).toBe(1);
  });
});

describe("Sammlung mit Datenschutzuhr", () => {
  it("anonymisiert ohne hineingereichte Uhr nichts", () => {
    einsaetzeSpeichern([sammlung([eintrag(bogen())])]);
    expect(einsaetzeLaden()[0]!.eintraege[0]!.bogen.personal[0]!.nachname).toBe("Berger");
  });

  it("überschreibt abgelaufene Meldungen beim Laden auch im Speicher", () => {
    einsaetzeSpeichern([sammlung([eintrag(bogen())])]);
    datenschutzUhrSetzen(() => NACH_FRIST);
    expect(einsaetzeLaden()[0]!.eintraege[0]!.bogen.personal[0]!.nachname).toBe(`${ANONYM_BEZEICHNUNG} 1`);
    expect(speicher.getItem("eeb.einsaetze.v1")).not.toMatch(/Berger|Ahlers|Anna/);
  });

  it("nimmt einen abgelaufenen Bogen gleich anonymisiert auf und erkennt den erneuten Scan als Dublette", () => {
    datenschutzUhrSetzen(() => NACH_FRIST);
    const s = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ);
    const erst = meldungHinzufuegen(s.id, bogen(), { herkunft: "RUVCMk…", signatur: { zustand: "gueltig", absender: { name: "Anna" } } });
    expect(erst?.neu).toBe(true);
    expect(erst?.eintrag.herkunft).toBeUndefined();
    expect(erst?.eintrag.signatur).toBeUndefined();
    expect(speicher.getItem("eeb.einsaetze.v1")).not.toMatch(/Berger|Ahlers|Anna|RUVCMk/);
    expect(meldungHinzufuegen(s.id, bogen())?.neu).toBe(false);
  });

  it("nimmt einen Bogen in der Frist unverändert auf", () => {
    datenschutzUhrSetzen(() => IN_FRIST);
    const s = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ);
    const r = meldungHinzufuegen(s.id, bogen(), { herkunft: "RUVCMk…" });
    expect(r?.eintrag.bogen.personal[0]!.nachname).toBe("Berger");
    expect(r?.eintrag.herkunft).toBe("RUVCMk…");
  });

  it("anonymisiert eine importierte Sammlung, bevor sie gespeichert wird", () => {
    datenschutzUhrSetzen(() => NACH_FRIST);
    const r = einsatzImportieren(sammlung([eintrag(bogen())]));
    expect(r).toEqual({ neuerEinsatz: true, hinzugefuegt: 1 });
    expect(speicher.getItem("eeb.einsaetze.v1")).not.toMatch(/Berger|Ahlers|Anna|RUVCMk/);
  });
});
