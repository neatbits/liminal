# Løse baller og hybridballbinger

Playroom får et begrenset antall løse `playball`-gjenstander på gulvet og i topplaget i
ballbingene. De har ekte kulefysikk i gåmodus: tyngdekraft, rulling, sprett og kollisjon
med spilleren, andre baller, lekeklosser, vegger og enkle møbelbokser. De kan sparkes ut
av bingen. Pause stopper simuleringen; reset/utgang gjenoppretter startposisjonene.

Resten av ballbingen er fortsatt instansiert geometri med shaderkjølvann, ikke individuelle
fysikklegemer. Hele bassenget er altså en hybrid. I frø 6 har 48 × 40-rommet 35 666 tegnede
bassengballer, og 96 × 80-rommet 98 268. De skal ikke gjøres om til like mange Cannon-kropper.

## Data og generering

- `core/play-balls.js` deler radius (7,5 cm), høydeprofil og faste små posisjonsforskyvninger.
  Fargene følger Playroom-paletten. Den kontinuerlige høydeprofilen gir hauger opptil 14 cm
  over den tidligere jevne overflaten; radforskyvning og større jitter bryter rutemønsteret.
  Antall instansierte baller økes ikke.
- `gen/play-balls.js` plasserer automatisk inntil 24 gulvballer og 24 topplagsballer, maksimalt
  **48 til sammen**, også i rom på 128 × 128. Tomme/små rom kan få færre. Samme frø gir samme
  resultat. Dørfronter, møbler og området rundt startpunktet holdes fri.
- `PLANS.playroom` bruker oppsettet `playballs` etter resten av møbleringen. De andre oppsettene
  reserverer plass innenfor `MAX_OBJECTS`; `softBuild` overholder også rommets objektgrense.
  Beregn opptatte ruter med én delt `poser`, ikke `objectsAt` per kandidat i et stort rom.
- `playball` finnes i objektvelgerens Play-gruppe, med ikon og engelsk forklaring. Brukeren
  kan sette inn flere selv innenfor den vanlige objektgrensen. Den automatiske 48-grensen
  er ikke en grense for manuelt tegnede baller.
- Ingen ny romformatversjon: `level.objects` lagrer eksisterende `{id,x,z,rot,v}`. `v` velger
  farge og posisjonsvariasjon innenfor ruten. Listene er immutable og følger angre/lagring/deling.
  `pit: true` tillater ballen på vannruter bare i et tema med `pit: 'balls'`. På gulv kan den
  plasseres også i andre temaer. `props-ball.js` bygger modellen uten eksterne modellfiler.

## Fysikk og tegning

`loose.radius` i katalogen velger `CANNON.Sphere`; eksisterende `loose.parts` beholder bokser.
`world/softphysics.js` deler én `poser` ved oppbygging. Ballene er lette (35 gram), bruker egne
kontaktmaterialer for sprett/friksjon og kan sove i ro. Spillerens kinematiske kropp må aldri
sove: den skal kunne vekke baller og klosser etter at brukeren har stått stille.

`world/ball-physics.js` legger et høydefelt over den tegnede ballmassens topplag, kun for
lekeballene (kollisjonsgruppe 2). Det bruker 0,5 m oppløsning og samme kontinuerlige profil
som `ball-layout.js`. Utenfor bingene ligger det under det ordinære gulvet. Dette er en
approksimasjon av ballmassens støtte, ikke simulert kontakt mot hver bakgrunnsball.
Faste møbler får enkle bokser bare for ballkollisjon. Andre fysikktyper beholder underlaget sitt.
Vegger og gulv dekker hele kartet når rommet har løse baller, så de kan rulle langt fra starten.

Statiske veggruter med samme rad samles i bokser med identisk samlet volum, uten å tette
døråpninger. Dette reduserer antall fysikklegemer. Ikke slå på Cannons alternative
`useBoundingBoxes` ukritisk: den valgte Cannon-versjonen mistet gulvkontakter i regresjonene.
Behold standardmodus og test gulv, vegger, vekking og kollisjoner ved slike endringer.

`SoftPlay._apply` flytter modellen etter fysikkens pose; modellens lokale origo er bunnen,
så rotasjonen må fortsatt få kulens senter til å treffe kroppens senter. Lys er bakt ved
startposisjonen som for eksisterende flyttbare gjenstander. De tegnede bakgrunnsballene beholder
romlige instansgrupper, konservative bounds og shaderkjølvann fra ytelsesarbeidet.

## Verifikasjon og kostnad

- `test/play-balls.test.js`: frø, store/små rom, 48-grensen, plassering, farger, manuell bruk,
  hauger uten rutekantskjøter og JSON/delingslenke.
- `test/play-ball-physics.test.js`: kuleform, tyngdekraft, rulling, sprett, vegger, møbler,
  andre baller, vekking, pause, modellens sentrum, reset, topplagsstøtte og å komme ut av bingen.
  Volum-/åpningstesten kontrollerer sammenslåtte vegger.
- `node scripts/check-play-balls.mjs`: faktisk asynkron Cannon-lasting i appen, bevegelig modell
  og fysikksenter, skjermbilder fra gulv/binge, pause, uendrede lagrede objekter og reset.
  Bildene ligger i `node_modules/.cache/play-ball-*.png`.
- `node scripts/measure-play-balls.mjs`: CPU-tid for `SoftPhysics.step`, uten rendering, for
  frø 6, med og uten de nye ballene. To simulerte sekunder oppvarming og åtte sekunder målt
  mens spillerkroppen beveger seg. Dette omfatter ikke rendering, modelloppdatering eller alle
  gangkollisjoner og er ingen FPS-måling.

Eksempel fra utviklingsmaskinen 22. oktober 2026, Node 24: median per fysikksteg var
0,10 → 0,91 ms i 48 × 40 (27 ekstra kuler) og 10,97 → 11,34 ms i 96 × 80 (48 ekstra kuler).
Store rom hadde allerede mange aktive klosser (136 i det største tilfellet). Kontaktforløp,
sovende kropper, frø og maskin påvirker tallene; dette er ikke en garanti for bildefrekvens.
Behold antallsgrensen og mål før den økes eller hele ballbassenget får fysikk.
