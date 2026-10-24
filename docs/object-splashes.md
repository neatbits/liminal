# Fysikkgjenstander som treffer vann

Plaststoler, lekeklosser og løse baller kan lage plask i ekte vann. Playrooms
ballbinger bruker samme rutetype, men gir aldri vannplask.

`world/object-splashes.js` følger de dynamiske kroppene i `SoftPhysics` via
Cannon-verdenens `postStep`. Dermed registreres også vannkontakt mellom to
renderbilder. Kollisjonsboksene prøves langs flatene med maksimalt 25 cm avstand;
kuler prøves i undersiden, uavhengig av rotasjon. Lokale prøvepunkter lages én gang.
Detektoren bruker delene i en stol, slik at tomrom mellom bein/rygg ikke gir treff
bare fordi ytterboksen overlapper vann. Dette er en lett kontaktprøve, ikke eksakt
volumklipping av alle flater.

Et punkt må være minst 3 mm under `WATER_SURFACE` i en vannrute. Første treff gir
`SoftPhysics.onSplash(x, z, strength)`; resten av nedsenkingen og kontakt med bunnen
er stille. Kroppen må ha vært helt utenfor vann i minst 80 ms for å kunne treffe
på nytt, og plask har 450 ms sperre per gjenstand. Gjenstander som starter i vannet
initialiseres som våte. Styrken følger masse og farten i treffpunktet, inkludert
rotasjon. Sovende kropper slipper kontaktprøven.

`SoftPlay` sender hendelsen videre til `WaterPlay`: eksisterende plaskringer og
flyteleker reagerer ved treffpunktet. Ringstyrken kan også være lavere enn et
vanlig spillerplask. Ringene virker ved 0 % bakgrunnsbølger. Spillerens HUD-blink
brukes ikke for gjenstander. Ringer nullstilles ved utgang/reset.

Lyden bruker `AudioEngine.splash(speed, gain = 1)`. Gjenstander får demping etter
styrke og avstand til spilleren; eksisterende spillerplask beholder sitt nivå.
Lydmotorens mute/pause/volum gjelder fortsatt, og avslått lyd fjerner ikke ringene.
Ingen ekstra renderpass, partikkelsimulering eller lydkontekst er lagt til.
Oppdrift/vannmotstand er ikke del av denne endringen; stolen kan fortsatt synke.
Romdata endres ikke, og WalkMode-pause fryser både fysikken og ringene.

## Kontroll

- `npx vitest run test/object-splashes.test.js`: ekte stol som dyttes i bassenget,
  stolbein/rotasjon, tomrom i ytterboksen, kuler, masse/fart, ballbinger, gjentatte
  treff, oppstart i vann, mute, avstandsdemping og reset.
- `node scripts/check-object-splashes.mjs`: ekte modell/fysikk og vannshader i Chrome;
  ett plask, ringer ved 0 %, ingen HUD-blink, mute, pause, uttoning og reset.
  Skjermbilde: `node_modules/.cache/object-splash.png`. Ingen høyttaleravspilling.
- `node scripts/check-water-depth.mjs`: vannrendering og synlige ringer i alle kvaliteter.
- `npm test` og `npm run test:browser` før endringen avsluttes.
