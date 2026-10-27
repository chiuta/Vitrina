# Jurnal de modificări

Format SemVer (MAJOR.MINOR.PATCH).

## 2.2.0 — 2026-10-27

Anterior: v2.1.0.

- Nou: alegerea „clic pentru încărcare” se poate reține între vizite. Cheia `vitrina_c2l` din `localStorage` (valoare `1` doar când e bifat; debifarea o șterge); toate accesările sunt în try/catch, deci cu stocarea blocată aplicația merge, iar modul funcționează pe durata sesiunii. **Oprit implicit** (prima vizită nu contactează nimic suplimentar față de înainte); eticheta spune acum „(se reține în acest browser)” în 8 limbi (RO/EN scrise, restul traducere automată). Cu modul reținut și un URL în adresă (#), pagina nu contactează Meta până la „Încarcă de la Meta”.
- README (8 limbi): rândul despre stocare actualizat (fără cookie-uri/sessionStorage/IndexedDB; singura excepție este această alegere). Celelalte 6 limbi: traducere automată.
- Teste: `tests/c2l-persist.test.mjs` nou (11 verificări: implicit oprit, scriere/ștergere cheie, persistență la reîncărcare, nicio cerere către facebook.com, localStorage blocat, valoare preexistentă); `click-to-load` 8/8 și `two-click` 24/24 trec.
- Neimplementat: pornirea implicită a modului (decizie de proprietar: schimbă comportamentul existent); testarea iframe-urilor Meta reale după clic (testele folosesc rețea simulată).

## 2.1.0 — 2026-10-27

Anterior: v2.0.0.

- Nou: mod opțional „clic pentru încărcare” (casetă bifabilă, 8 limbi): după „Afișează” apare un substituent și nu se contactează Meta până la „Încarcă de la Meta”. Oprit implicit, nu se reține.
- Documentație: descrierea modului, linii Stare/Offline.
- Nu s-a făcut: modul nu e pornit implicit și nu se reține între sesiuni (decizie de păstrat comportamentul existent; de decis de proprietar).
