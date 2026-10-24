# Ytelse og visuell kontroll

## Gjenta målingen

`node scripts/measure-world.mjs` måler CPU-arbeid i Node: generering og lysbakte flater i
64 × 48 ruter, frø 6, for Office, Mall, Playroom og School. Én oppvarmingsrunde og medianen
av fem målinger per tema. Geometri og antall lys/objekter vises sammen med tiden.

`node scripts/check-scenes.mjs` starter Vite og en isolert hodeløs Chrome/Edge-profil.
Den laster modeller, kontrollerer shaderfeil og renderer temaene samt vinduer i dagslys,
gyllen time og natt. Skjermbilder lagres under `node_modules/.cache/`. Ingen e-post sendes.
Dette supplerer `npm run test:browser`, som tester brukerflytene i produksjonsbygget.

## Måling 22. oktober 2026

Samme maskin og Node 24.15.0, før/etter endringene i lysoppslag og automatisk vindustetthet:

| Tema | Lysbakte flater før | Etter | Automatisk antall vinduer før → etter |
| --- | ---: | ---: | ---: |
| Office | 117,77 ms | 81,07 ms | 110 → 22 |
| Mall | 303,09 ms | 246,07 ms | 0 → 0 |
| Playroom | 142,16 ms | 95,55 ms | 76 → 13 |
| School | 112,36 ms | 80,85 ms | 126 → 32 |

Dette er omtrent 19–33 % kortere tid for lysbaking og flatebygging i disse rommene. Andre frø
og maskiner vil variere. Vinduer har 25 % av tidligere plasseringssannsynlighet; hvert enkelt
rom vil variere rundt dette. Tettheten testes over 40 frø per tema.

Målingen omfatter ikke nedlasting/dekoding av modeller, maling av canvas-teksturer, all
øvrig verdensgeometri eller GPU-rendering. Mall har uendret antall flatevertexer i målingen.
FPS, mobilbruk, GPU-minne og effekten av ny gulvglans må måles på fysisk maskinvare før
det gis løfter om bildefrekvens. SwiftShader egner seg til funksjonskontroll, ikke GPU-benchmark.

## Bevar disse egenskapene

- Vannets absorpsjon må følge den synlige bunnen/veggen, ikke dybdesonen rett under vannflaten.
  `water/refraction.js` leser dybde fra det eksisterende brytningspasset; ingen ekstra renderpass.
  Inverter den faktiske skrå klippeprojeksjonen, ikke `projectionMatrixInverse`/near/far fra
  originalkameraet. Dybdeteksturen følger render targetets størrelse og frigjøring. Dette gir
  ett ekstra teksturoppslag per vannpiksel og en dybdetekstur i brytningsbildets oppløsning.
  Enkel vannkvalitet bruker jevn optisk tykkelse uten brytningspass. Kjør
  `node scripts/check-water-depth.mjs`: fire kamerabilder/modi og ti GPU/raycast-prøver.
  Den kontrollerer også landing i vann ved 0 % bakgrunnsbølger: synlige plaskringer i alle
  tre vannkvaliteter, ingen bakgrunnsbevegelse, og stille vann igjen når ringene dør ut.
  `waterWaves` styrer bare bakgrunnsbølger; ringer fra plask og gange må aldri skaleres bort.

- `world/light-grid.js` gjenbruker lyskandidater fra de samme romlige bøttene, med maksimalt
  512 bufrede kandidatsett. `near` gir kandidater, ikke en eksakt sirkulær radius.
  Lysbakingen sjekker fortsatt eksakt avstand, normaler og siktlinje. Behandle listen som skrivebeskyttet.
- `lightSampleKey` bruker tall bare for eksakt representerbare 5 cm-punkter med aksejustert
  normal innenfor faste grenser. Tilbakekonvertering må gi identiske koordinater. Alle andre
  punkter får tapsfri strengnøkkel, også svært små høydeforskjeller. Ikke rund modellpunkter her.
- Nabovinduer telles med høyst 29 ruteoppslag per vindu, i stedet for alle par. Dermed
  beholdes dagslysets normalisering også i rom med mange håndmalte vinduer.
- `createObjects` deler én `poser(level)` mellom modeller. Lag en ny ved endring av rommet.
- Karm, vindusbrett (utenfor Poolrooms) og eventuelle sprosser er geometri i én materialgruppe. Glasset
  har en prosedyretekstur med himmel, disig silhuett og refleksstriper, uten ekstra renderpass.
  Sprosser krever `theme.window.bars === true` (School, Hotel, Basement). Poolrooms har hele
  innfelte glassfelt og solflekker uten sprosseskygge. Tematilpasset utsikt har analytisk dybde
  uten ekstra renderpass; se `docs/windows.md` for profil, sammenslåing og GPU-kontroll.
- `world/wayfinding.js` legger sparsom dekor på rette vegger uten vinduer/formede hjørner.
  Maksimalt 24 skilt, ett atlas og én mesh per rom. Skiltene endrer ikke lagrede romdata.
- Mall og School bruker eksisterende glansshader på utvalgte gulv. Playroom beholder matte
  skummaterialer. Nye teksturer males én gang og deles via teksturregisteret.
- Level 0 (`textures/yellow.js`) har jevnere, lysere tapet og teppe uten mørke fuktflekker
  eller vannringer. `carpetDamp` er beholdt som historisk teksturnøkkel. Den renere himlingen
  har egen nøkkel, `levelZeroCeiling`; ikke bytt ut den delte `ceilingTiles` for andre temaer.
  Gulfarge, mønster, matte fibre og lysrør er fortsatt en del av uttrykket. Materialendringene
  krever ingen nye renderpass. Sammenlign med `node scripts/check-scenes.mjs level0 windows-day`;
  uten argumenter kontrollerer skriptet alle referansescenene.
- Tema-id `office` og lagrede romnavn er uendret. Temaets etikett er «The Office»;
  eksempelet «The Office at 3 AM» har eksplisitt nattehimmel.

## Store Poolrooms og Playroom: mindre geometri per bilde

`node scripts/measure-render.mjs` måler antall innsendte trekanter og tegnekommandoer i
genererte rom på 48 × 40 og 96 × 80, frø 6, med tre kameravinkler fra samme startpunkt.
Rendererens `info.autoReset` er midlertidig av, så tellingen omfatter alle pass, inkludert
speiling og brytning i Poolrooms. Målingen bruker redusert etterbehandling og 50 % oppløsning
for å kunne gjentas raskt i SwiftShader; vannets speiling/brytning er på. Oppløsningen endrer
ikke geometritellingen. Resultater lagres i `node_modules/.cache/render-measure.json`.

Før/etter denne inndelingen i samme arbeidsområde, før løse fysikkballer ble lagt til, 22. oktober 2026. Gjennomsnitt av de tre
kameravinklene, avrundet:

| Tema / størrelse | Trekanter før | Etter | Reduksjon | Tegnekommandoer før → etter |
| --- | ---: | ---: | ---: | ---: |
| Poolrooms 48 × 40 | 194 777 | 149 527 | 23,2 % | 73 → 117 |
| Poolrooms 96 × 80 | 695 460 | 582 118 | 16,3 % | 174 → 306 |
| Playroom 48 × 40 | 2 915 635 | 1 270 533 | 56,4 % | 31 → 57 |
| Playroom 96 × 80 | 8 143 169 | 2 650 139 | 67,5 % | 140 → 215 |

Dette er redusert innsendt geometri, ikke en dokumentert FPS-økning. Inndelingen gir flere
tegnekommandoer; CPU-kostnaden ved dem må veies mot mindre vertexarbeid på fysisk GPU.
Fordelen er størst i gåmodus med deler av rommet utenfor kameraet. En oversikt som viser hele
rommet trenger fortsatt all geometrien. Modeller, vannets pikselarbeid og fysikk koster fortsatt;
store rom kan fortsatt trenge lavere oppløsning/vannkvalitet på svake maskiner.

- `world/chunks.js` deler store `MeshData`-flater i 16 × 16 m-grupper fra hele firkanter.
  Under 8192 vertexer beholdes en flate samlet. Posisjon, UV, bakt lys, blink og omløp kopieres
  uendret; ingenting forenkles eller fjernes. Bounds beregnes fra reell geometri, så firkanter
  som går over en gruppegrense blir med. Gruppene deler materialer/uniforms.
- Three.js tester hver gruppe mot kameraet for hvert pass, også speil-/brytningskameraene.
  Ikke frys `visible` ut fra hovedkameraet; det kan skjule flater som speilet trenger.
- `world/balls.js` deler de samme ballinstansene i 8 × 8 m-grupper med én delt geometri og
  ett delt materiale. `balls.mesh` er nå en Group; barna er InstancedMesh. Antall baller og
  detaljnivå er uendret. Konservativ boundsmargin omfatter maksimal forskyvning fra alle åtte
  kjølvannspunkter. Shaderen hopper over punkter med null styrke; pause oppfører seg som før.
- Kall `dispose()` på hver instansgruppe, deretter én gang på delt geometri/materiale.
  Rendererens instansattributter må frigjøres ved nivåbytte. `world.stats.vertices` teller nå
  også ballinstansene; høyere rapportert total betyr ikke at flere baller er lagt til.
- Skriptet sammenligner selve canvas-bildet med og uten frustum-culling ved samme tid/kamera.
  Testscenene gir identiske piksler, inkludert vannpass og aktivt kjølvann ved gruppegrenser.
  `test/chunks.test.js` kontrollerer at alle originale firkanter/attributter bevares;
  `test/ball-chunks.test.js` kontrollerer instanser, bounds, uniforms, pause og frigjøring.

Neste ytelsesrunde bør måle GPU-frame-tid på fysisk maskinvare, spesielt vannpass,
fulle oversikter og store mengder modeller, før ytterligere endringer av detaljnivå.

Løse baller med begrenset fysikk og mer ujevne ballbinger er dokumentert i `docs/play-balls.md`.
Den tette ballmassen beholder instansgruppene; hele bassenget skal ikke gis individuell fysikk.
