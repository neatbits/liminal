# Rulletrapper og dekorbasseng i Mall

Nye Mall-rom og eksempelet har to brede rulletrapper mellom atriet og galleriet: vest går
opp, øst går ned. Små rom uten etasjer får ingen. Vanlige trapper og tidligere lagrede
rom beholder oppførselen sin. Stairs-verktøyet tegner fortsatt vanlige trapper.

## Manuell plassering

Velg **Heights → Escalator** (hurtigtast **E** i editoren). Velg **Up** eller **Down**
for kjøreretningen, og bruk **Brush size** for bredden i meter. Dra fra nedre repos
til øvre repos; løpet møter et hevet gulv eller dekke i enden. Som vanlige trapper
kan løpet tegnes uten ferdig øvre repos (0,6 m stigning per rute), men brukeren bør
lage en gangbar landing med Raise/Deck. Høydene kommer fra samme `placeStairs`-
logikk, som også håndterer omvendt dragning og alle fire retninger.

Dette er et eget bygge-verktøy fordi lengde, bredde og etasjehøyde varierer. Det er
ikke en fast modell i Object-katalogen. `tools.js` gir Escalator samme `stairs`-
dragning som Stairs, med `escalator`-flagget og motorretningen. `pointer.js` husker
valget når dragningen starter og kaller `applyStairs` ved slipp. Ingen nye shaders,
objekttyper eller romlag. Eksisterende Mall-generering er uendret.

Grønne piler viser motorretningen, også i forhåndsvisningen. Statuslinjen viser
«Escalator (up/down)». Høyre-drag fjerner løpet; angre/gjør om, lagring og deling
bruker de eksisterende romlagene. Ny tegning med Stairs gjør løpet ordinært igjen.

Fontenene plasseres på siden av atriets trafikkakse med minst to hele gulvrader mellom
vann og trappeløpet. De tilpasses ledig plass og utelates i trange atrier. Ikke legg vann
rett foran på-/avstigningen. Mall møbleres uten palmer; Poolrooms kan fortsatt ha dem.
`test/mall-clearance.test.js` kontrollerer dette i flere størrelser og med flere frø.

`core/escalators.js` bruker eksisterende `TILE.STAIRS`, `floors` og `meta`:

- Bit 0–1: oppoverretning, som før (`STAIR_DIRS`).
- Bit 2 (`4`): rulletrapp.
- Bit 3 (`8`): motoren går nedover; ellers oppover.

Dette passer i eksisterende metadataområde 0–15 i romformat v3. Kopiering, angre,
eksport, lagring og deling beholder flaggene. `setTile` rydder dem når typen endres;
tegnes trappen på nytt med Stairs, blir den en vanlig trapp igjen.

`escalatorRuns` samler sammenhengende ruter og like nabolaner til brede løp. Sidepaneler,
avrundede svarte håndløpere og metallunderside bygges av `world/escalators.js` i tre
materialgrupper. Ordinære flistrinn, sidekiler og rekkverk hoppes over på disse rutene.
`escalatorFloor` fyller fotavtrykket i løpet med temaets gulv i starthøyden: uten dette
ser man scenebakgrunnen som en hvit/grå flate gjennom hullet under den frie trappen.
Kollisjonsvernet følger fortsatt `core/railings.js`, og ganghøydene følger `groundAt`.

`world/escalator-motion.js` lager én mesh per løp med attributter for hvert trinn. GPU-en
flytter hele metalltrinn langs løpet og feller dem inn ved reposene. Lys bakes én gang;
ingen trinn flyttes på CPU-en og ingen ekstra renderpass kreves. Riller bruker `fwidth`
for å dempe flimring på avstand. Geometri og materialer frigjøres når verdenen byttes.

Gange og animasjon deler `ESCALATOR_SPEED` (0,45 vannrette m/s). `escalatorVelocity`
transporterer bare spillere som står nær trinnhøyden uten fart i hopp/fall. Motoren bruker
vanlig kollisjon, lager ingen fottrinn/hodevugging og stopper på reposet. Brukeren kan gå
begge veier. Pause fryser både gangens `dt` og shaderens delte `uTime`. Pilene i 2D-skissen
er grønne og viser kjøreretningen; vanlige trapper beholder pilen oppover.

Mall-materialene er inspirert av eldre kjøpesentre: store lys grålilla steinfliser,
rosa perforert himling, varme lys og bleke sidepaneler. Ingen bildeaktiva er kopiert.

Dekorbassengene bruker `mallMosaic` og `fountainStone` fra `textures/fountains.js`,
dempet grønt vann og svakere bølger. `surfaces.basin.caustics: false` er et eksplisitt
temaoverstyr; andre temaer beholder kaustikkene sine. `core/fountains.js` deler kantens
bredde (24 cm) og høyde (12 cm) mellom gange og geometri. Kanten ligger inne i vannrutene,
og følger bare sider mot gulv/søyler. `groundAt` gir høyden på kanten, mens `floorAt`
fortsatt gir bassengbunnen. Vannflaten ligger fortsatt ved felles `WATER_SURFACE`.
`world/fountains.js` deler rutene i 3 × 3 felter, så hjørnene ikke får overlappende
toppflater. Steinen og messinglisten samles i to meshgrupper med eksisterende bakt lys;
det kreves ingen nye renderpass. Nye rammer kommer også rundt vann i lagrede Mall-rom.

Kontroller:

- `npm test` dekker retninger, transport til begge repos, pause, motgange, flagg,
  kopiering/JSON/delingslenke og erstatning av vanlig trappegeometri.
- `test/escalator-editor.test.js` dekker manuell plassering i fire retninger,
  opp/ned, bredde, gulv/dekke, omvendt dragning, sletting, angre og status.
- `scripts/check-escalator-editor.mjs` inngår i produksjonssjekken og bruker ekte
  verktøyvalg, pekerdrag, høyrevisking, breddevalg, angre/gjør om, E og delingslenke.
  Begge animerte løp kontrolleres og tegnes i 3D. Bilde: `node_modules/.cache/manual-escalators.png`.
- `test/fountains.test.js` dekker kantgeometri, hjørneareal, ganghøyder og en tur inn
  og ut av bassenget; Poolrooms beholder sine materialer og høyder.
- `node scripts/check-escalators.mjs` kompilerer shaderne i Chrome, tar bilder fra
  begge etasjer, over/under trappen og ved dekorbassenget i `node_modules/.cache/mall-escalator-*.png`.
  Raycasting bekrefter gulvet under løpet. Med bare trinnene synlige gir endret
  simuleringstid bevegelse, mens lik tid gir identisk bilde.
- `npm run test:browser` kontrollerer resten av appflyten og produksjonsbygget.

SwiftShader-sjekken dokumenterer rendering og funksjon, ikke bildefrekvens på fysisk GPU.
