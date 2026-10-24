# Oppstart uten tilgjengelig WebGL

Et GPU-krasj kan få nettleseren til å blokkere nye WebGL-kontekster midlertidig.
Da kastet `new Viewer` før `App` hadde laget sidepanel/menyer eller lastet rommet.
Resultatet var både tom 2D-skisse og tom 3D-visning, selv etter publisering av en
rettelse for shaderfeilen som først utløste krasjet.

`view3d/create-viewer.js` fanger bare feil som gjelder oppretting av WebGL-kontekst.
Andre programmeringsfeil kastes videre. `view3d/unavailable.js` gir en begrenset
visningskontroller, slik at resten av appen kan starte normalt:

- Rom, 2D-verktøy, menyer og utkast lastes og fungerer som vanlig.
- 3D-panelet viser en forklaring, tekniske feildetaljer og «Try 3D again».
- Gåmodus, foto og visningsknapper forklarer hvorfor 3D ikke er tilgjengelig.
- Innstillings-/stemningsendringer kan fortsatt lagres. Statuslinjen sier at 3D
  ikke er tilgjengelig; den viser ikke oppdiktet byggtid eller geometritall.
- Nytt forsøk laster siden på nytt. `DraftSaver` bevarer siste redigering ved
  `pagehide`; romdata og lagrede rom slettes ikke for å komme videre.

Hvis nettleseren fortsatt blokkerer WebGL ved omlasting, er neste steg å avslutte
alle nettleservinduer og åpne simulatoren igjen. Dette nullstiller grafikkøkten,
uten å slette lokal lagring. Ikke foreslå sletting av nettstedsdata som første
tiltak: «My rooms» og utkast ligger der. Ved uklar oppstartsfeil må den første
konsollfeilen innhentes; skjermbildet alene fastslår ikke årsaken hos brukeren.

Dette håndterer oppstartsfeil; det gjør ikke en ødelagt shader kompatibel. Behold
Direct3D-rettelsen og maskinvaretestene beskrevet i `windows.md`.

## Kontroll

`scripts/check-unavailable-browser.mjs` kjøres av `npm run test:browser` og
`npm run test:browser -- --hardware`. Den lar 2D-kontekster fungere, men avviser
WebGL-kontekster i en isolert nettleserprofil. Den kontrollerer synlig forklaring,
menyer, tegnet 2D, veggmaling/angre, trygg avvisning av gåmodus og siste navneendring ved
omlasting. Eksisterende romliste skal være byte-for-byte uendret. Blokkeringen
fjernes så, og knappen skal gjenopprette 3D med det samme rommet.

Forventede konsollmeldinger fra den tvungne WebGL-feilen kontrolleres særskilt.
Ingen ukontrollerte JavaScript-feil tillates. Testen fremprovoserer ikke et ekte
driverkrasj. Skjermbilde: `node_modules/.cache/webgl-unavailable.png`.
