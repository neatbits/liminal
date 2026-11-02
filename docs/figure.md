# Den sorte skikkelsen

Monsteret i Uncanny og Nightmare, og den som står utenfor vinduene. Den erstatter spøkelsesmodellen
(«Ghost from Room 226»), som er fjernet, med kilde og kreditering. Den er kode uten modellfil, så ingen
lisens eller lasting.

## Utseende

`view3d/monster.js` (`Monster3D`) er én flate som vender mot den som ser (`figurePose` i `core/figure.js`).
Kroppen regnes ut i `view3d/figure-material.js` som avstand til hode, skuldre, kropp, lange armer og bein,
og støy forskyver kanten. Beina løser seg opp mot gulvet, og det er røyk rundt kroppen. Ingen munn.
`uRush` (fra `ai.fast`) gjør den mer utvisket, `uDark` (strømmen) tenner to svake øyne, så den kan ses i mørket.

Den er gjennomsiktig uten dybdeskriving og følger veggene med vanlig dybdetest. Tåken slår inn senere enn
for resten av rommet (fog-faktoren i andre), så den er sort på nært hold og glir inn i bakgrunnen på avstand.
Med `monster.warm()` kompileres shaderen usynlig under overgangen til et nivå. Tida står stille ved `dt = 0`.

## Oppførsel (`world/monster-ai.js`)

- **I lyset** (`lurk`): den dukker opp foran en, 7–14 m unna, og lister seg (`SLINK`, 0,9 m/s) til et sted man ikke
  ser fra der man står (`_hideout`, 3–12 m veilengde), og er borte der. Kommer man nærmere enn `VANISH_NEAR`,
  blir den rask (`DART`) helt bort. Finnes det ikke noe skjul, står den stille og forsvinner som før.
- **I mørket** (`hunt`): den lister seg på avstand (`SPEED` 1,3 m/s, Nightmare `chase.speed` 1,7). Innenfor `RUSH_NEAR`
  (6 m), med fri sikt, gjør den et utfall i `RUSH_TIME` (2 s) med `RUSH` (3,4 m/s, Nightmare `chase.rush` 3,6), raskere enn
  man løper (3,1). Så må den hvile i `RUSH_REST` (3 s, Nightmare `chase.rest` 4,5). Den som ser den i tide og løper, slipper ofte unna; den som bare går, blir oftest tatt.
- **Sporet** (`world/monster-trail.js`, bare Nightmare): den ser deg innenfor `chase.sight` (7 m) med fri sikt, ellers får den vite hvor du er
  hvert `chase.sense` sekund (6 s) og går dit. Så kan man riste den av seg rundt et hjørne, men ikke gjemme seg for godt.
- Uncanny er `gentle`: utfallet kommer, men den er borte før den når fram.

## Vinduene

`view3d/figure-snapshot.js` tegner skikkelsen én gang til et bilde, som `world/window-ghost-view.js` setter i
utsikten. Se `docs/windows.md`.

## Tester

`test/figure.test.js` (utseende, pause, sniking, utfall, hvile, sikt, skjul) og `test/monster.test.js`.
`scripts/check-figure.mjs` i `npm run test:browser`: mørke piksler, røyk, pause, utfall og shaders, med bilder i
`node_modules/.cache/figure-*.png`. `scripts/check-nightmare.mjs` dekker jakten, brølet og å bli tatt.
