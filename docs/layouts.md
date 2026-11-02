# Planløsninger

Nye nivåer i hotell, kontor, Poolrooms, lekerom, skole, sykehus, parkering, Level 0, kjøpesenter og kjeller bygges etter en av tre til fem planløsninger,
eller to side om side. Eksemplene (`vary: false`, layout `'gallery'`) og rom som er for små for alle planløsningene, bruker de gamle oppsettene. Unntatt i
hotell og kontor er det gamle oppsettet også med i trekningen (`classic`), og i Level 0 og kjøpesenteret trekkes det oftest (`weight`). Kjøpesenterets
classic er atriet med gallerier, med sine egne varianter (`gallery`, `cross-court`, `terraces` i `gen/mall-shop-layout.js`).

| Tema | Navn | Innhold |
| --- | --- | --- |
| hotel | `wing` | Lange ganger med like, speilvendte rom: bad og entré nærmest gangen, soverom innerst |
| hotel | `lobby` | Høy hall med søyler og resepsjon, rom rundt, ganger ut i begge ender |
| hotel | `conference` | Ballsal i midten, brede ganger rundt, møterom ytterst |
| hotel | `staff` | Labyrint med ganger på én rute, vaskerom og lager |
| office | `open` | Stor flate med båser av halvvegger, små rom langs den ene siden |
| office | `cells` | Kontorer ytterst, ringgang, kjerne med heis, toaletter og kopirom |
| office | `conference` | Brede ganger med store møterom bak glassvegger |
| office | `archive` | Gang gjennom bygget, mørke saler med rader av hyller |
| pool | `cathedral` | Hall med 9–14 m takhøyde, søyler på 3 m i vannet, fire bassenger med ulik dybde |
| pool | `lagoon` | Stor lagune med sklier fra plattformer på 3,6–6 m |
| pool | `abyss` | Smale gangbroer over 3 m dypt vann, alltid svarte fliser, dempet lys og ingen badeting |
| pool | `canals` | Lave ganger under vann (0,5 m), tørre rom og dype sjakter |
| playroom | `ballsea` | Hele gulvet er ballbinge, med øyer |
| playroom | `softmaze` | Lav labyrint med små binger og krypehull gjennom veggene |
| playroom | `tower` | Høy hall med stor binge og sklier fra høye plattformer |
| playroom | `blacklight` | Saler uten taklys, bare LED-striper |
| school | `classrooms` | Brede ganger med skap, klasserom med pultrader mot tavlen |
| school | `gym` | Høy sal med tribune, basketkurver og garderober med skap |
| school | `auditorium` | Scene, og en sal der gulvet stiger bakover i rader på 0,3 m |
| school | `library` | Høy sal med rader av bokhyller og lesebord |
| school | `cafeteria` | Lange bord, disk og kjøkken |
| ward | `nightingale` | Lange, åpne sengesaler og venterom |
| ward | `surgery` | Flislagte operasjonsstuer bak glass, og vaskerom |
| ward | `isolation` | Små, låste rom tett i tett langs svake ganger |
| ward | `morgue` | Flislagte rom med likskuffer og tildekkede bårer |
| garage | `bays` | Rader med biler under presenning, søyler og kjørefelt |
| garage | `flooded` | Svart vann over hele planet, bare tørt langs veggene |
| garage | `crypt` | 2,2 m under taket, søyler for hver tredje meter |
| backrooms | `maze` | Trang labyrint med små rom |
| backrooms | `pillars` | Endeløs flate med tynne søyler |
| backrooms | `canyon` | Smale ganger med høyt tak |
| backrooms | `lowrooms` | Bred, lav flate med krypehull |
| backrooms | `halls` | Lange, tomme haller (6–9 m brede) etter hverandre: én rad lysrør langs midten, mørke vinduer inn til nabohallen, ventiler i gulvet og en klynge trestoler innerst; blekt tapet, sterkere lys og mindre dis (`weight` 2) |
| backrooms | `slope` | Labyrint oppe, en stor sal (12–18 m bred) der gulvet skråner jevnt ned 2–3,5 m i hele bredden (rampe, `core/ramps.js`), av og til rader av stoler nede vendt mot veggen, og en dør i bunnen til labyrinten nede. Gulvet kan ikke ligge under 0, så alt oppe heves etter `joinRegions` (`ctx.after`); står derfor alltid alene (`pairs: []`). Start oppe med åpningen rett foran (`level.start` → `autoSpawn`). Halvvegger settes ikke mot hevet gulv eller ulik takhøyde. Ikke i Noclip (`zoneLevel` trekker på nytt): gangene der går på gulvhøyde 0 og måtte gravd seg gjennom reposet |
| mall | `foodcourt` | Kafeer langs veggen (begge når det er plass), høy hall med bord og fontene under glasstak (7 m) |
| mall | `promenade` | Handlegater på 4,6 m med butikker på begge sider, de fleste stengt, benker og trær i midten, ganger i endene |
| mall | `service` | Bakganger på 2,8 m med lager (hyllerader), boder, personalrom og toaletter |
| basement | `storage` | Boder på 2–3 m langs smale ganger, de fleste låst, 2,3 m under taket |
| basement | `boiler` | Fyrrom på 3,4 m med kjeler og søyler, låste tekniske rom langs den ene veggen |
| basement | `shelter` | Tilfluktsrom på 2,2 m med sovesaler med køyesenger, lager og toaletter |
| basement | `laundry` | Fellesvaskeri: vaskerom, tørkerom og boder |
| airport | `concourse` | Lang gang (4,8–6 m tak) med gater på en eller begge sider (seterader mot glassveggene), og en og annen kafé (`eatery`), taxfree (`dutyfree`), toalett eller kontor (`weight` 2) |
| airport | `checkin` | Høy innsjekkingshall (6,5–8 m) med søyler, skranker langs bakveggen og kø-sperrer foran, og kontorer og toaletter bak |
| airport | `baggage` | Bagasjehall med bånd på rekke, traller langs veggene, og toaletter og kontorer bak |

## Slik henger det sammen

- `gen/layouts.js` velger (`LAYOUTS`: `min` = minste størrelse, `pairs` = hva som kan stå ved siden av), bygger, binder sammen,
  henger opp lys og dører og demper rommene i `DIM`. I bygg med minst 40 m lengste side er det 40 % sjanse for to planløsninger.
  `generateLevel({ layout: 'lobby+wing' })` tvinger fram en bestemt (tester og feilsøking).
- Planløsningene tegner i et rektangel i `gen/*-layouts.js`, med byggeklossene i `gen/floorplan.js`.
  `frame(rect)` gir koordinater langs (u) og på tvers (v) av den lengste siden, så de virker i begge retninger.
- `level.plan` er rommene med funksjon (`kind`). Det finnes bare under genereringen, og `onPlan` gir det til tester.
  `gen/furnish-rooms.js` og `gen/furnish-institutions.js` møblerer etter `kind`; av de vanlige `PLANS` brukes da bare småting (`LOOSE` i `gen/furnish.js`). Nye gjenstander
  som hører til et rom, legges der. Krypeganger holder seg utenfor rommene.
- `joinRegions` graver en gang mellom deler som ikke henger sammen, og er det som kobler to planløsninger.
- `corridorRows` (`gen/floorplan.js`) lager parallelle ganger med rader av rom imellom og to ganger i endene: bodene, tilfluktsrommet,
  vaskeriet og bakgangene. Butikkradene i kjøpesenteret er `shops` fra `gen/mall-shop-layout.js`, alltid langs x fordi fasadene leses slik
  (`core/shopfronts.js`); de møbleres i `ctx.after` med `furnishShops`. Høyst 16 butikker får innredning (`MAX_OPEN`), resten står tomme.
  Møbleringen av de nye rommene ligger i `gen/furnish-cellar.js`. Over 6 m takhøyde i kjøpesenteret blir det glasstak (`core/mall-roof.js`).

## Grenser i Poolrooms og lekerommet

Vannflaten ligger alltid i samme høyde, så trinn i vannet går ikke: det som varierer, er dybde, takhøyde og hvor mye som står under vann.
Hver ballrute koster omtrent 70 tegnede baller, så ballhavet har høyst `PIT_MAX` ruter, og store bygg får gulv rundt det. Hver LED-rute
er en lyskilde, så det mørke rommet har LED på hver tredje vegg-rute. Lyset under 8 m bakes som en søyle (`HANG`), så det når gulvet i katedralen.
`dim` i `LAYOUTS` slukker en andel av lysene, og `look` låser utseendet når planløsningen står alene. Rom-typen `bare` gir bare småting fra `PLANS`.

## Glassvegger og båser

`glasswall` har samme fotavtrykk og navigasjon som `halfwall` (`core/half-walls.js`), men bare den lave sokkelen stenger lyset. Rammen
er en vanlig gjenstand (`world/props-rooms.js`), og glasset legges i butikkvinduenes flategruppe (`world/glass-walls.js`). `glaze` gjør tre
veggruter om til gulv med en bjelke over (takhøyde 2,2 m). Båsene er `halfwall`-gjenstander (`gen/cubicles.js`), høyst 48 fordi hver
av dem koster lysbakingen. De settes inn før startpunktet; pultene kommer med møblene.

## Utseende

`level.look` (`core/looks.js`) gir bygningen egen tapet og teppefarge, per etasje. 0 er temaets eget. Maleriene er varianter med egen palett
(`textures/looks.js`). Feltet lagres bare når det ikke er 0, så eldre rom er uendret. Det velges i romfanen (Style).

## Modellen

`double_bed` (Victorian Bed, CC BY 4.0) er skalert til 2 m lengde og forenklet til en firedel (`model.json`), fordi en romfløy kan ha over
20 senger. Toalettet og vasken er modeller (`docs/models.md`); nattbord, speil, vaskemaskin, kopimaskin, arkivhyller og heisdører bygges av enkle former. Hver arkivsal har høyst 30 hyller.

Egne former: bokhylle, basketkurv, operasjonsbord og -lampe, likskuffer, båre og tildekket bil (`world/props-institution.js`), fyrkjel
(`world/props-cellar.js`). Køyesengen er en modell (`docs/models.md`); begge står i gruppen Basement i objektvelgeren. Modellen
`book_shelf` i `3dmodels/` er Sketchfab Standard og skal ikke brukes.

Tester: `layouts.test.js`, `extreme-layouts.test.js`, `institution-layouts.test.js`, `cellar-layouts.test.js` og nettlesersjekken `check-layouts.mjs` (bilder i `node_modules/.cache/layout-*.jpg`).
