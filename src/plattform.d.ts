/**
 * Das eine Web-Standard-Global, das die Sammlung braucht — hier von Hand
 * deklariert.
 *
 * `crypto.randomUUID()` gibt es in jeder Zielumgebung (Node seit 19, jeder
 * Browser im sicheren Kontext, jede WebView). Sein TYP kommt jedoch nur über
 * `lib.dom` oder `@types/node`, und beides ist in `tsconfig.json` bewusst
 * abgeschaltet (ADR-003, Aufnahmeregel 2).
 *
 * Deklariert ist nur, was tatsächlich aufgerufen wird, und zwar als optional:
 * im unsicheren Kontext (http:// ohne localhost) fehlt `randomUUID`
 * tatsächlich, und die Sammlung fällt dann auf Zeitstempel plus Zufallszahl
 * zurück. Das ist kein Notnagel, sondern der Normalfall in Testumgebungen.
 */

declare const crypto: { randomUUID?: () => string } | undefined;
