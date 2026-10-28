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
- `lightSampleKey` bruker tall bare for eksakt representerbare 5 cm-punkter med normal på
  0,25-gitteret innenfor faste grenser (gjenstandene avrundes dit i `object-light.js`, før
  nøkkelen). Tilbakekonvertering må gi identiske koordinater. Alle andre punkter får tapsfri
  strengnøkkel, også svært små høydeforskjeller. Ikke rund punkter inne i selve nøkkelen.
- `objectSample` (gjenstander) regner siktlinjene fra selve 5 cm-punktet, med start 2 cm mot
  hvert lys (vannrett), i stedet for 2 cm ut langs normalen som flatene (`sample`) trenger ved
  rutegrensene. Dermed gjenbrukes de for alle normalene og begge sidene der (i snitt 7 prøver per
  punkt i Mall). Eget buffer (svaret avhenger ikke av rekkefølgen), frigjort med
  `releaseObjectSamples` når gjenstandene er bakt. Ikke bruk objectSample for flater.
  Nærbilder mot gammel baking: møbler høyst 3–19 av 255 nivåer (snitt ≤ 0,11). Halvveggene
  endres synlig og riktigere: toppen skygget før for seg selv (startpunktet lå inne i veggens
  skyggeboks), nå får den lys ovenfra. `test/object-light.test.js` dekker selvskyggen.
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

## Måling 24. oktober 2026: modeller, ballbinger og tegnekall

Brukerrapport 24. oktober 2026: flytende på Samsung Galaxy S25+ (toppmodell). Mellomklasse- og
eldre telefoner er ikke testet ennå – det er der gevinsten bør bekreftes.

Lastetid varierer mye med varme på en bærbar maskin (samme bygg: 0,6–1,0 s); sammenlign derfor
vekselvis med og uten en endring i samme økt, ikke med tall fra en annen dag.

Ekte GPU (RTX 5070 Ti Laptop, ANGLE/D3D11), 1600 × 900, Full effekter, faste frø (Mall: frø 7,
`gallery`). Bildetid måles med `readPixels` etter hvert bilde, så vsync ikke skjuler den. På dette
kortet er bildetiden 1–8 ms før og etter; gevinsten gjelder svakere GPU-er og mobil (færre
vertexer og tegnekall), og må bekreftes der.

| Rom / visning | Før | Etter |
| --- | ---: | ---: |
| Playroom gåmodus, trekanter | 1 187 341 | 407 419 |
| Mall gåmodus, trekanter | 3 585 440 | 1 754 218 |
| Mall gåmodus, tegnekall (alle pass) | 1 420 | 646 |
| Office gåmodus, trekanter | 199 085 | 119 071 |
| Mall lastetid, bufrede modeller (A/B, bare lysbakingen) | ~3,0 s | ~1,2 s |

- Ballbinger: grupper lenger unna enn `BALL_LOD_DISTANCE` (6 m fra gruppens kant) bytter til
  impostorer. Et grovt ikosaeder (20 trekanter) ble forkastet: sekskantet på nært hold.
- `object-batches.js`: 32 m-grupper ga knapt færre kall (1113 → 1068), men 10 % flere
  trekanter; 16 m beholdes.
- `object-parts.js` + `object-atlas.js`: like materialer slås sammen, teksturer med ellers likt
  utseende (UV innenfor 0–1, flipY = false) får et atlas per modell (maks 4096, 8 px kant) og
  fargedeler en palett. Piksler mot uten sammenslåing: kassaapparat/TV-benk/kiosk identiske,
  HiFi 0,05 % og apotekhylle 0,3 % av pikslene med små filtreringsforskjeller ved flisekanter.
  Skjermstøy (`screen`, UV-områder) og arkadekassene (bytter tekstur per del) holdes utenfor.
- Gulvspeilingen (Mall) står for omtrent en tredel av kallene; møbler lenger unna enn 12 m og
  kontaktskygger er utelatt der, uten synlig forskjell i referansebildet.
- Lysbaking av gjenstander er fortsatt det tyngste ved lasting (~0,9 s i Mall), nå mest selve
  lysløkken (avstand og vinkel per kandidat). Neste steg kan være å bake i en worker.

## Måling 28. oktober 2026: fysikken i store nivåer

Brukerrapport: gåmodus i store nivåer blir tung, og lavere grafikk hjelper lite – altså CPU, ikke GPU.
Målt i hodeløs Chrome (SwiftShader) med JS-tid per bilde i gåmodus, nivåer i størrelsen Huge (frø 5),
60 bilder fra startpunktet. Tegningen (`postfx.render`) var 1–6 ms i Level 0/Poolrooms/Office; det tunge
var `play.update` → `SoftPhysics.step` (cannon-es) for løse gjenstander (stoler, baller), selv med
bare 19–32 av dem:

| Nivå (Huge) | Kropper (faste) | Fysikk før | Etter |
| --- | ---: | ---: | ---: |
| Level 0, 88 × 79 | 793 (773) | 9,0 ms | 2,0 ms |
| Poolrooms, 88 × 79 | 1 524 (1 491) | 16,6 ms | 4,1 ms |
| Playroom, 88 × 79 (193 klosser/baller), de første sekundene | 1 511 (1 317) | ~15 ms | 9,8 ms |
| Playroom etter 15 s (klossene sover, 24 baller ruller) | | | 1,5 ms |

- `SAPBroadphase` bryter ikke søket for par av to faste kropper, så alle vegg-/gulvbokser sjekkes mot
  hverandre hvert steg (kvadratisk). `world/mover-broadphase.js` søker bare fra det som beveger seg
  (våkne kropper mot de faste i et 4 m-rutenett rundt seg og mot de andre som beveger seg, sovende bare
  mot de andre som beveger seg; svært store faste kropper som gulvplanet sjekkes alltid) med AABB +
  cannons kuletest. Søket i Playroom: 5,9 → 1,1 ms. Samme
  mulige kontakter (`test/mover-broadphase.test.js` mot en fullstendig sjekk av alle par). Merk: cannon
  merker ikke AABB-en utdatert når `position` settes etter at formen er lagt til – faste kropper regnes
  derfor ut én gang, de som beveger seg hvert steg.
- `ArrayCollisionMatrix` har én plass per par av kropper (≈ 1,2 mill. i Poolrooms Huge, to stykker) og
  nullstilles hvert steg; `ObjectCollisionMatrix` lagrer bare parene som berører hverandre.
- Gjenstående: Mall Huge har ~1 000 tegnekall (alle pass) og 10–20 ms CPU i `render` i SwiftShader;
  det må måles på ekte GPU før noe endres. Tåken gjør alt utenfor ~2,5/tetthet m usynlig (60–200 m),
  så en kortere `camera.far` i gåmodus gir bare noe i de aller største nivåene.
