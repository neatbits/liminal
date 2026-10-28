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
- Takhøyde, vanndybde, frø, nøkkeltall, lys, «Make it wrong» og generering gjelder etasjen som
  tegnes; størrelse og tema gjelder hele bygget.
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
under og sjakten ikke stenger noe over (sjekket med flomfylling). Eksempelet **The Hotel Floors**, og
genererte nivåer i `FLOOR_THEMES` får 2–3 etasjer med 20 % sjanse. Kassettene ligger i etasje 0.

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
