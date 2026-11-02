# Etasjer

Et rom kan ha opptil `MAX_STOREYS` (8) etasjer. Etasje 0 er rommet selv (`level`), og
`level.storeys` er etasjene over, hver et vanlig rom med samme størrelse: egne lag, gjenstander,
sklier, takhøyde, vanndybde og frø. Tema, himmel, lysfarge, tåke og lysstyrke hører til bygget
(`SHARED`) og kopieres inn av `storeyLevel(room, k)` – bruk den, ikke `room.storeys[k - 1]`.

Dagens dekker (`decks`) er fortsatt mesaniner *innenfor* en etasje.

## Etasjehøyde og bassenger

Bassenger går ned under gulvet. Etasjehøyden regnes ut (`storeyGap`): etasjen over begynner over det
høyeste taket i etasjen under (`highestCeiling`) pluss platen (`SLAB`) – og høyt nok til at hvert
basseng over et rom (`poolsOver`) henger ned som en kasse med `HEADROOM` (2,1 m) under seg.
`walkLevels` senker taket i rommet under til undersiden av bassenget der det trengs. All bassengkode
virker uendret i hver etasje, i etasjens egne koordinater.

## Editoren

- `editor.room` er hele rommet, `editor.level` etasjen som tegnes (`editor.storey`). Verktøy,
  peker og tegning virker på `editor.level` som før.
- Velgeren over skissen (`ui/storey-bar.js`), Edit-menyen og Page Up/Down. Handlingene ligger i
  `app/storey-actions.js`. Etasjen under vises blekt med stiplet kant (`editor/render-storey.js`).
- Takhøyde, vanndybde, frø, nøkkeltall, lys og «Make it wrong» gjelder etasjen som tegnes; størrelsen gjelder
  hele bygget. Generate/Random lager hele bygget, eller med «This floor only» bare etasjen som tegnes.
- **Angre**: et bilde gjelder én etasje (`history.push(room, k)`, husker nummeret) eller hele
  bygget (`'all'`: størrelse og etasjelisten). `undo`/`redo` returnerer `{ storey }` eller
  `{ all: true }`, og editoren viser etasjen som ble endret. Gå via `editor.checkpoint(all)` og
  `editor.settle()`, ikke `history` direkte.

## Trapperom (`core/stairwells.js`)

Verktøyet **Stairs up** legger en trapp med meta-biten `STAIR_THROUGH`. Ruten rett forbi toppen er
reposet. Hver etasje er fortsatt et vanlig rom: `walkLevels(room)` lager kopiene som bygges og gås i:

- Etasje k: løpet stiger nøyaktig til etasjehøyden (`gap`), reposet er gulv i samme høyde, og hele
  trapperommet er åpent opp til taket i etasjen over (bratte trapper får takhøyde nok – `climbBase`
  regner taket mot den høyeste bakken under sirkelen).
- Etasje k + 1: løpet er vegg (sjakten), reposet gulv; gjenstander i sjakten fjernes.
- `seams` (`world/seams.js`): ingen gulvflate på reposet der oppe og ingen vegg mot løpet; ingen
  takflate og bare vegger under gulvet der oppe for reposet i etasjen under, og ikke rekkverk der.
- `storeyAt`: man bytter etasje midt på reposet (0,55 opp / 0,45 ned, mot flimring). Høyden er lik i begge.
- `highestCeiling` teller ikke trappene opp, ellers ville etasjehøyden og trappen jaget hverandre.

## 3D og gåing (`view3d/storeys.js`)

`Storeys` bygger én verden per etasje (også etasje 0), løftet til etasjehøyden. Oversikten viser
etasjene opp til den som tegnes og sikter på den (`overview.raise`); massiv vegg skjules i øvre etasjer.
I gåmodus vises etasjen man står i og naboene. Ved bytte blir etasjens verden `viewer.world` og etasjen
`walk.level` (`walk.setWorld` beholder gåeren); `walk.base` løfter kameraet og monsteret. Bare etasjen
man står i har speiling og brytning i vannet. Strømbrudd gjelder hele bygget; gåing og «våkn opp»
starter i etasje 0 (`walk.beforeEnter`); ombygging mens man går holder en i samme etasje (`rebuilt`).
«Hendelser bak ryggen» står over i bygg med flere etasjer (de bygger om én etasje alene).

## Kjøpesenteret

Mall-galleriet er dekker (mesanin i én etasje) rundt et åpent atrium og beholdes slik. Glasstaket
hører til toppen av bygget: `walkLevels` setter `covered` på alle etasjer under den øverste, og
`mallRoof` gir da null (flatt tak). Så krasjer ikke taket med etasjen over.

## Genererte bygg (`gen/floors.js`)

`stackFloors(room, rand, n)` legger til nesten like etasjer: kopier av etasje 0 med «Make it wrong»
(subtle), uten trappene opp fra etasje 0, og et trapperom fra etasjen under der løpet ikke stenger noe
under og sjakten ikke stenger noe over (sjekket med flomfylling). Brukes av eksempelet **The Hotel Floors**,
som må bli likt hver gang.

## Blandede bygg (`gen/mixed-floors.js`)

`addFloors` (fra `nextLevel`, bare vanlige romnivåer) gir nye nivåer 1 (55 %), 2 (30 %) eller 3 (15 %) etasjer;
rom på minst `BIG_ROOM` ruter høyst 2. Oftest er hver etasje et eget `generateLevel` med et tema som ikke er brukt
i bygget (`MIX_THEMES`, alt unntatt Mall, som er for høy og har egen struktur). I `FLOOR_THEMES` er en
tredjedel nesten like kopier. Alle etasjene har størrelsen fra etasje 0.

- **Trapp eller stige** (`connect`): høyden avgjør. Trappen får `stairRun(gap)` ruter (ca. 0,65 m per rute), men
  bare opp til `STAIR_MAX` (4,5 m). Over det blir det stige; ellers trapp i 75 % av byggene, med den andre som reserve.
- **Alt kan nås**: hver forbindelse må ligge der man kan gå fra der man kom inn i etasjen (`reachableCells` med
  `blocked`), må ikke stenge av noe under, og må føre ut i minst halve etasjen over. Hull, utganger og reposer er
  `held`, så neste forbindelse ikke havner oppå dem. Sjakten går bare gjennom gulv og vegg, aldri vann eller sklier.
- **Tak på sjekkene**: flomfyllingen er dyr, så `CHECKS` plasser prøves per forbindelse; deretter tas reserven.
- **Stemningen** (`moodLevel`) gjelder alle etasjene. `linkCells` gir rutene der trapper og stiger går av og på, og
  `makeWrong(…, keep)` lar dem være. Dype bassenger bare i etasje 0: de ville endret etasjehøyden over.
- **Kassetter**: `storeyEntry` (`core/stairwells.js`) gir veien inn i en etasje også når det bare er en stige dit.
- **Byggetid** (hele bygget, nettleser på utviklingsmaskinen, nov. 2026): Medium høyst 0,6 s, Large 1,3 s, Huge 1,9 s.

Lights out legger skapene i etasjen man starter i; strømmen gjelder hele bygget.

## Bygg fra editoren (`gen/new-building.js`)

New room velger 1–8 etasjer (`newBuilding`): generert (hvert sitt tema, eller samme tema med ulike rom), haller med
trapp eller stige, eller tomme etasjer. I rom på minst `BIG_ROOM` ruter kan man velge høyst 3, unntatt tomme
(`floorLimit`: 8 genererte etasjer på 128 × 128 m låser siden i over 20 s). Generate og Random (`generateBuilding`, fra
`generateInto`) erstatter hele bygget i rommets tema, som ett angre-punkt (`checkpoint(true)`), og velger Random (1–3)
eller 1–3 etasjer. Samme frø, tema, størrelse og etasjevalg gir samme bygg, og etasje 0 er den samme uansett antall
etasjer (`FLOOR_SEED`). Takhøyden til rommet beholdes, så stigningen i trappene stemmer. Får ikke alle
etasjene forbindelse, blir bygget lavere, og New room sier fra. Mall får etasjer bare når man ber om et antall.

## Format

Romformat v4: `storeys: [{ height, waterDepth, rows, …lag, slides, objects }]`
(`core/serialize-storeys.js`). v1–v3 leses fortsatt; en etasje kan ikke ha egne etasjer.

## Tester

`test/storeys.test.js`, `stairwells.test.js`, `floors.test.js` (logikk, format, lagring, angre, trapperom) og `scripts/check-storeys.mjs` i
`npm run test:browser` (velger, pekerdrag i etasje 2, Ctrl+Z, Page Up/Down, kopi/ny/fjern,
delingslenke, 3D-stabelen og gåmodus) og `scripts/check-stairwells.mjs` (opp og ned trappen). Skjermbilder: `node_modules/.cache/storeys-2d.png`, `storeys-3d.png`.

## Startetasje og kjeller

`room.spawnStorey` er etasjen man starter i (startpunktet er den etasjens `spawn`; Spawn-verktøyet
setter begge). Den lagres i formatet og i angre-historikken, og følger med når etasjer legges til og
fjernes. «Add floor below» (`insertBelow`) lager en kjeller: innholdet i rommet flyttes til etasje 1,
og rommet blir den tomme etasjen. `removeStorey(room, 0)` gjør det motsatte.

## Utforsking i bygg

Kassettene ligger også i de andre etasjene (én i hver, nåbar fra trappen: `Storeys.entry`), husker
etasjen sin og kan bare plukkes der (`Tapes.placeFloors`). En låst dør regner kassetter i andre etasjer
som mulige å nå. Jager monsteret en når man tar trappen, kommer det etter (`Scary._newFloor`, 2,5 s)
og dukker opp på reposet. «Hendelser bak ryggen» endrer den lagrede etasjen man står i, i en kopi av
hele bygget, og glemmer det man har gått forbi ved etasjebytte. Lys fra etasjen over faller ned i
trapperommet (`level.borrowed`), og reposet i etasjen under har vern for kollisjon (ikke tegnet).

## Sklier ned fra etasjen over (`core/slide-drops.js`)

En sklie med `drop` lagres i etasjen med bassenget, men starter på gulvet i etasjen over. Slide-verktøyet
lager den når man i en øvre etasje drar fra gulvet til en rute som er vann bare i etasjen under
(`dropTarget`; skissen viser bassenget der nede blått). `applyDrops` (fra `walkLevels`): startruten er en
åpning (`opening` i `core/storey-seams.js`, som reposet i et trapperom), og rutene der rennen når opp i
etasjeskillet er en sjakt (`shaft`). `slidePath` får da toppen i høyde med gulvet over. I gåmodus finner
`Storeys.dropAt` sklien når man går inn i toppen i etasjen over, bytter til etasjen under og gir banen
til `Rider` – man lander i bassenget der. Lagret rom: `addSlide` løfter ikke taket for slike sklier
(det ville løftet etasjen over), og `slidePath` regner med toppen minst over taket.

`copyStorey` (⧉ og `stackFloors`) kopierer bassengene, men ikke sklier ned fra etasjen over, og trapper opp
blir gulv. `stairwells` hopper over en trapp opp som ligger i sjakten eller på reposet nedenfra. Skissen
viser bare vann der nede der etasjen man tegner ikke selv har vann; drar man en sklie mot et basseng
som har et basseng rett over seg, gir `editor/pointer.js` et hint (`COVERED_HELP`). Går banen over vann i etasjen man tegner i, er det alltid
en vanlig sklie der (`dropTarget`), og `applyDrops` hopper over lagrede sklier ned med vann der oppe.

## Tykke sjaktvegger (`world/shaft-walls.js`)

Innsiden av en sjakt er veggene i etasjen under, som går opp gjennom etasjeskillet. I etasjen over er
sjaktrutene vegg og merket i `seams.shaft`; `shaftWall` flytter veggflatene mot sjakten `THICK` (10 cm)
ut i rommet, forlenger dem rundt utvendige hjørner og gir endeflater mot vanlige vegger og mot åpningen.
`buildEntrance` lager buen inn fra åpningen (`seams.open`) i en like tykk vegg opp til taket, innenfor
sjakten. Kollisjonen følger fortsatt rutekanten.

## Gjenstander

Trapper, reposer, sjakter og sklitopper rydder gjenstander etter hele fotavtrykket (`clearObjects` i
`core/object-pose.js`), og `gen/floors.js` velger trappeplass utenom fotavtrykkene (`footprintCells`).

## Tema per etasje

Temaet hører til etasjen (`OWN` i `core/storeys.js`, ikke `SHARED`): `storeyLevel` gir rommets tema til
etasjer uten eget (eldre rom). Lagres i `storeys[]` bare når det er et annet enn rommets. I gåmodus følger
tåke, lys og lyd temaet i etasjen man er i (`Storeys._switch` → `setWorld` og `_applyLook`). Sjakter og
trapperom tilhører etasjen under, så veggene inne i dem har dens tema.

## Heiser (`core/elevators.js`)

En heis er en sjakt på 4 × 4 ruter gjennom hele bygget og lagres i rommet (`room.elevators`: `[{ x, z, dir }]`, x/z =
hjørnet med lavest x og z; listen byttes ut, endres aldri på stedet). I heisens eget system (`cellOf`) er u langs døren og
v innover fra dørveggen: vognen er 2 × 2 (u, v = 1–2), døråpningen u = 1–2 i v = 0, resten sjaktvegg, og reposet v = −1.
Heisen stopper i etasjene med vanlig gulv på begge reposrutene (`elevatorStops`), minst to; i etasjene imellom er hele
sjakten vegg. `applyElevators` (fra `walkLevels`, sist): vognen og døråpningen får gulvet i høyde med reposet, vognen
2,4 m tak og ett `LIGHT.FLICKER`-lys, døren 2,1 m; gjenstander i sjakten og på reposet fjernes; etasjene får `lifts`.

- **Editoren**: verktøyet Elevator (Y, i Stairs-familien) legger heisen rundt ruten man klikker, med dørene dit flest
  etasjer har gulv; klikk igjen snur, høyreklikk fjerner (`toggleElevator`, angre for hele bygget). Skissen viser vognen,
  døren med pil og etasjene den stopper i (`editor/render-elevators.js`), og en kryssert blokk der sjakten går forbi.
- **Format**: `elevators: [[x, z, dir]]` i rommet (ingen ny versjon; gamle lesere ser bort fra feltet). Følger med i
  `resizeLevel` (faller bort når den ikke får plass), angre (`snapshot`) og ikke i `copyStorey`/`insertBelow`.
- **3D**: `world/lifts.js` (metallpaneler, håndlist, karm, knappepaneler og plate til etasjelampene) og
  `world/lift-doors.js` (dørblad som glir inn i veggen, lamper som lyser av seg selv og lyspanelet i taket; `world.lifts`).
  **Lik i alle etasjer**: vognen og døråpningen er kledd helt innvendig (vegger, tak, gulv, kanten over døren og sidene
  i døråpningen), i egne materialer (`lift`, `liftFloor` i `world-materials.js`), ikke temaets. Lyset bakes uten temaets
  farge (`neutralField`: samme styrke, grått), og blinkelyset får grå farge i materialet (`neutralLight`). Lyset i vognen
  er merket `bare` i `collectLights`, så temaets armatur ikke tegnes; lyspanelet blafrer med samme blinkegruppe.
  Styrken følger fortsatt temaets lys og eksponering.
- **Gåing** (`view3d/lifts.js`): E ved dørene kaller heisen (knappen lyser til den kommer), inne går E til neste etasje og
  tallene 1–8 velger (`app/shortcuts.js`). Dørene står åpne 5 s og lukkes ikke mens noen står i døråpningen; mens de ikke
  er åpne, er døråpningen `TILE.WALL` i `walk.level`. Turen: 2,6 s + 1,6 s per etasje med motordur, knirk, risting og lys
  som blafrer (etasjen dempes et øyeblikk); så `Storeys.enter` med samme punkt i vognen. Lyd: `audio/lift.js`.
  Nettlesersjekk: `check-elevator.mjs`.
- **Genererte bygg** (`gen/elevators.js`, fra `linkFloors`: nye nivåer, New room og Generate/Random): heisen kommer i
  tillegg til trappen eller stigen, i 40 % av byggene med to etasjer og 60 % med flere (`ELEVATOR_CHANCE`; rundt 40 % får
  en i praksis, ellers er det ikke plass). Eget frø fra rommets, så resten av bygget er uendret. Sjakten går bare
  gjennom vegg og vanlig gulv (der den bare går forbi: bare vegg), aldri trapper, reposer, stiger, hull, vann eller
  sklier (`linkCells` + løpene), og ikke over startpunktet. Flest stopp og mest vegg vinner; de beste `CHECKS` prøves
  med flomfylling: reposet må ligge i minst halve etasjen, og sjakten må ikke stenge noe av. Reposet er med i
  `linkCells`, så «Make it wrong» lar det være. Ikke i kjøpesenteret. Tid: snitt 29 ms, verst 110 ms (60 bygg).

## Stiger (`core/ladders.js`)

En stige er en gulvrute i etasje k med `meta` `LADDER` + retning (bit 0–1, `STAIR_DIRS`): dit går man av
og på. Stigen står mot motsatt kant av hullet, og man klatrer på siden mot utgangen, vendt mot stigen, så
man blir på sin side både opp og ned (ingen snuing). `applyLadders` (fra `walkLevels`): hullet i etasje k + 1 er
rundt (`HOLE_R`) og uten rekkverk. Det er `TILE.WALL` for kollisjonen (rutekanten ligger 2–18 cm utenfor
hullkanten) og står i `seams.hole`: surfaces bygger gulvet rundt hullet og taket over det, ingen vegger og ingen
hjørneskygge mot det. Ruten under er åpen opp til taket der oppe (`ceilings`), med `seams.hatch`: himling rundt
hullet og rund sjakt (`world/holes.js`) mellom himlingen og gulvet over; veggene klippes ved himlingen (`clip`),
og etasjen under tegner ikke taket over hullet (`noCeiling`). Ingen egen lampe, lånt lys. Etasjene får `ladders`
og `holes` ({ i, x, z, dir, gap, k }). 3D: `world/ladders.js` (vanger og trinn med håndtak over gulvet der oppe,
i rekkverksmaterialet). Gåing: `view3d/climb.js` (E ved foten, eller ved hullet fra alle sider, også bak
stigen (derfra flyttes man rundt), W/S, etasjebytte via `Storeys.enter`). Veggtoppene i etasjer med en etasje over
stopper under etasjeskillet (`capMax`). Nettlesersjekk: `check-ladders.mjs`.
