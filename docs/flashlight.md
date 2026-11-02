# Lommelykten

F i gåmodus (Light-knappen på mobil). Tilstanden ligger i `view3d/flashlight.js` (eies av `WalkMode`, slås av i `exit`), lyset i
shaderne (`world/flashlight.js`).

- Lyset bakes per vertex, men lykten sitter ved øyet: alt man ser, har fri sikt til den, så den trenger verken skygger eller ny baking.
  Forskyvningen til hånden (16 cm til høyre, 14 cm ned) er for liten til at det synes.
- `flashlight(world)` legges på etter `uBoost`, så strømbrudd ikke demper den. Normalen regnes ut av `dFdx`/`dFdy`, fordi flatene ikke har normaler.
  `flashBeam(world)` er det samme uten flateretning (baller og vann).
- `FLASH` er ett sett uniformer, delt av alle etasjene via `createSharedUniforms`. Er lykten av, returnerer shaderen med en gang.
- Bruker: flatene (`materials.js`), gjenstandene (`object-shader.js`), ballene, vannet, og `withFlash` for kassetter og sikringsskap
  (de er `MeshBasicMaterial` og dempes ellers med strømmen). Lamper, fontener og vinduer er uten: de lyser selv eller er utsikt.
- Skikkelsen er med vilje svart også i strålen: den står som en silhuett mot det opplyste.
- Batteriet er uendelig, og lykten påvirker ikke skikkelsen.

Tester: `flashlight.test.js` og nettlesersjekken `check-flashlight.mjs` (bilder i `node_modules/.cache/flashlight-*.png`). Ved endringer i GLSL: kjør også `npm run test:browser -- --hardware`.

## Mørke uten lamper

Omgivelseslyset bakes bare der lampene når (`AMBIENT` i `world/lighting.js`: fullt over `REF` i direkte lys, ellers ned mot
`FLOOR` = 12 %), så et rom uten lamper krever lykten. Tåken i gåmodus mørkner der det er mørkt rundt deg og under strømbrudd
(`view3d/fog-light.js`, prøver lysfeltet på et 0,5 m-gitter i øyehøyde). 3D-oversikten i editoren legger omgivelseslyset tilbake der
det bakte lyset er svakt (`world/fill.js`: `withFill` i flate-, gjenstands- og vannshaderen, `uFill` = 1 når `setBoost` er over 1).
Nye shadere med bakt lys bør bruke `withFill` som de andre.

Står man 2,5 s i mørket med lykten av, minner HUD-en om den («Press F», på mobil «Tap Light»): høyst tre ganger med minst 75 s imellom,
aldri etter at lykten er brukt i økten, og ikke med tomt batteri (`world/flash-hint.js`, vist fra `view3d/fog-light.js`).
