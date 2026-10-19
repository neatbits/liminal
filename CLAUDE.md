# Liminal – prosjektregler

Liminal-simulator i three.js: brukeren tegner rom i en 2D-skisse (rutenett, 1 rute = 1 m),
ser dem synkronisert i en 3D-forhåndsvisning, og kan gå i rommet (også i fullskjerm).
Rom kan lagres lokalt, eksporteres som JSON og deles som lenke (`#room=...`; gamle
`#rom=`-lenker og formatnavnet `liminal-rom` leses fortsatt).

Tre sider (Vite multi-page): forsiden `index.html` (`src/landing.js`, eksempelkort og
reklameplass `#ad-slot`), simulatoren `app/index.html` (`src/main.js`) og
`about/index.html` (`src/about.js`, personvern og kreditering). Forhåndsbildet for lenker er
`public/og-image.jpg` (lag nytt med fotomodus, `view3d/photo.js`, i 1200 × 630). Gamle lenker til
roten med `#room=`/`#rom=` sendes videre til `app/`; `app/#example=<id>` åpner et eksempel.

## Kommandoer

- `npm run dev` – utviklingsserver (Vite, port 5180)
- `npm test` – kjør alle tester én gang (Vitest)
- `npm run test:watch` – tester i watch-modus
- `npm run build` – produksjonsbygg til `dist/`
- `npm run deploy` – tester, bygger og laster opp `dist/` over SFTP (tilkobling i
  `.env.deploy`, se `deploy.example.env`; `--dry-run`, `--clean`, `--env <fil>`)
- `npm run models` – gjør kildemodellene i `3dmodels/<navn>/` (glTF) om til komprimerte
  `models/<navn>.glb` (krever `@gltf-transform/cli`, bare utviklingsverktøy)

Publisering (liminalsimulator.com, neatbits.no/liminal/): last opp *innholdet* i `dist/`
(`index.html`, `app/`, `assets/` og `.htaccess`), aldri prosjektrotens HTML-filer – de peker
på `/src/…` og virker bare via Vite. Bygget bruker relativ base (`./`), så det fungerer i en
undermappe. `public/.htaccess` sender http:// videre til https:// (Apache hos one.com).

## Faste regler

1. **Små filer: maks 200–250 linjer per fil.** Nærmer en fil seg grensen, del den opp
   etter ansvar før du legger til mer. Gjelder også CSS og tester.
2. **CHANGELOG.md skal vedlikeholdes.** Hver endring som påvirker brukeren eller
   arkitekturen føres under `## [Ukommet]` (Lagt til / Endret / Fikset / Fjernet).
   Ved versjonsbump flyttes punktene til en ny versjonsseksjon med dato.
3. **Testing via Vitest.** Ny eller endret logikk i `src/core`, `src/gen` og den rene
   delen av `src/world` skal ha tester i `test/`. Kjør `npm test` før du sier deg ferdig.
4. **Ren logikk holdes fri for DOM og three.js** (`src/core`, `src/gen`,
   `src/world/lighting.js`, `src/world/collision.js`, `src/world/floaters.js`,
   `src/world/ball-layout.js`, `src/world/monster-ai.js`, `src/world/paths.js`,
   `src/world/autopilot.js`, `src/world/windows.js`, `src/view3d/flicker.js`,
   `src/view3d/events.js`, `src/audio/acoustics.js`, `src/audio/director.js`,
   `src/world/softphysics.js`) slik at den
   kan testes i Node.
5. Brukergrensesnittet er på **engelsk** (all tekst brukeren ser: knapper, menyer,
   dialoger, feilmeldinger, temanavn og eksempler). Kode, identifikatorer og kommentarer
   kan være på norsk eller engelsk, men vær konsekvent innen en fil.
6. **Nye gjenstander møbleres inn i romtypene.** Når en ny modell legges i katalogen
   (`OBJECTS` i `core/objects.js`), skal den også legges inn i `PLANS` i `gen/furnish.js`
   for de temaene der den passer naturlig (f.eks. kontorstol på kontoret, vannkjøler på
   kontor/kjøpesenter, benk i kjøpesenteret), med en tetthet som passer stemningen –
   glissent i de tomme rommene. Passer den ingen steder, holdes den utenfor `PLANS`.
   Oppdater testene i `test/furnish.test.js` om nødvendig.

## Arkitektur

```
src/
  core/      romdata (level), serialisering, lagring, historikk, verktøyoperasjoner, temaer
  gen/       prosedyregenerering av rom og ferdige eksempler
  world/     bygger 3D-verden fra et rom: geometri, bakt lys, materialer, armaturer, kollisjon
  textures/  prosedyrelle canvas-teksturer per tema (ingen eksterne bildefiler)
  view3d/    renderer, kamera (oversikt/topp/gå), etterbehandling, input, HUD
  audio/     prosedyrell lyd (lysrørsurr, ventilasjon, fottrinn, romklang som følger rommet,
             bakgrunnslyder over tid: director.js bestemmer når, ambient.js lager lydene)
  editor/    2D-skissen: viewport, tegning, input
  ui/        toppmeny, sidepanel, modaler, toasts
  landing.js forsiden
  styles/    CSS delt per område
```

- **Romformat** (`core/level.js`): alle lag i `LAYERS` (`tiles`, `lights`, `ceilings`,
  `depths`, `floors`, `finish`, `meta`, `decks`) er `Uint8Array(w*h)`, indeks `z*w+x`. Utenfor kartet regnes
  som vegg. Verdensenhet = meter, x = kolonne, z = rad. Nye lag legges i `LAYERS` (da
  følger kopiering, størrelsesendring og angre med) og i `LAYERS` i `serialize.js`.
- **Soner** (`core/zones.js`): `ceilings`, `depths` og `floors` holder takhøyde,
  bassengdybde og gulvhøyde i desimeter; 0 = rommets `height` / `waterDepth` / 0 m.
  `finish` er belegg (0 = temaets, 1 = fliser) og lagres som tall (`raw`).
- **Dekker** (andre etasje, laget `decks`, desimeter): bare gulv- og søyleruter. Søylen har
  to rom: gulv → `deck − SLAB` og `deck` → tak. `floorAt`/`ceilingAt` gjelder hele søylen;
  bruk `groundAt(level, x, z, y)` og `headAt(…, y)` med høyden man står i for å få riktig
  etasje (gange, kollisjon, vern). Vern på dekker har `y` i `railSides`. Lys i en rute med
  dekke gir én armatur per etasje; platen stenger siktlinjen (`cellHeights().slab`).
  Geometrien ligger i `world/decks.js` (`openSpans` deler vegger og søyler per etasje).
- **Gjenstander** (`core/objects.js`): katalogen `OBJECTS` (id → label, file, size, credit) og
  `level.objects` = [{ id, x, z, rot }], som sklielisten aldri endret på stedet. Ny modell:
  legg glTF i `3dmodels/<navn>/`, kjør `npm run models`, og legg en oppføring i `OBJECTS`
  (size = utstrekning i meter etter `scale`, forsiden mot +z – bruk `turn` om modellen vender
  feil). Bruk bare CC0/CC-BY-modeller (siden har reklame) og før opp kreditering i `credit`;
  CC BY krever i tillegg `attribution` (tittel, kilde, skaper, lisens med lenker – About-siden
  viser det). Behold lisensfilen i `3dmodels/<navn>/`. 3D-delen (`world/objects.js`) laster .glb
  asynkront, sentrerer modellen og baker rommets lys per vertex. `surface` (høyde) gjør en
  gjenstand til en flate andre settes oppå; `floats` lar den ligge i vann, og i gåmodus
  dyttes slike rundt (`world/floaters.js` via `view3d/water-play.js`). Med `build` i stedet for
  `file` bygges gjenstanden av enkle former i `world/props.js` (variant per tema/rute via
  `propKey`); deler med `unlit` lyser av seg selv (skilt, lyskasser). `soft` = lekeklosser: de
  `mount: 'ceiling'|'wall'` (+ `lift`) henger gjenstanden under taket eller på veggen bak, `spin`
  får den til å snurre (takvifte). `soft` = lekeklosser: de
  stables på klossene før seg i listen, er ikke faste hindringer, og i gåmodus styres de av
  fysikk (`world/softphysics.js` med cannon-es, lastet dynamisk av `view3d/softplay.js`).
- **Rekkverk** (`core/railings.js`): reglene for hvilke kanter som får vern/håndlist brukes
  både av geometrien (`world/railings.js`) og kollisjonen – endre dem bare der.
- **Vannsklier** (`core/slides.js`): `level.slides` er en liste med objekter
  `{ points: [[x, z], …], tube }` oppå rutenettet. Listen og objektene endres aldri på
  stedet – lag en ny liste (angre sammenligner med `===`, og banene bufres per objekt).
  `slidePath` gir den glattede banen som både 3D (`world/slides.js`), kollisjon, 2D og
  skliingen (`view3d/rider.js`) bruker.
- **Utforsking** (`view3d/explore.js`): VHS-kassetter (`gen/tapes.js`, `view3d/tapes.js`),
  strømbrudd (`view3d/events.js`, demper via `world.setPower`) og uendelige nivåer: en dør
  til ingensteds i gåmodus kaller `walk.onExit` → `gen/endless.js` lager neste nivå, som
  vises med `viewer.setLevel(level, { explorer: true })`; rommet fra editoren (`home`) settes
  tilbake når man går ut. `generateLevel` legger inn utganger (`gen/exits.js`), også i
  ytterkanten – kanten er da vegg eller en lukket dør til ingensteds – og gjenstander etter
  temaet (`gen/furnish.js`, `PLANS`). Begge har eget frø, så romoppsettet er uendret.
- **Vinduer** (`core/windows.js`): en veggrute med `meta & 1` er et vindu – fortsatt vegg for
  kollisjon, lys og dører. `level.sky` (SKIES) gir himmel, dagslys (lyskilder med egen farge,
  `rgb`) og solflekker (`sunPatch`). 3D i `world/windows.js`; surfaces.js lar åpningen stå åpen.
- **Korridorbygg** (`gen/building.js`): skolen og sykehuset. Korridorene på skolen får belegg
  (`finish`), og temaets `tiles` tegner belegget som skap – samme triks kan brukes for andre
  vegger med eget utseende i deler av et bygg.
- **«Make it wrong»** (`gen/wrong.js`): katalogen `CHANGES` med små endringer (hver returnerer
  `{ what, cells }` eller null), vektet (`WEIGHTS`) og begrenset (`MAX`). Nye endringer skal være
  subtile hver for seg, aldri skumle, og ikke dele rommet i to (testen sjekker at det henger sammen).
- **Drømmegange** (`view3d/drift.js` + `world/autopilot.js`): autopiloten bruker
  `world/paths.js` (som monsteret) og går gjennom dører til ingensteds via `walk.onExit`.
- **Scary mode** (`settings.scary`): `view3d/scary.js` styrer monsteret (`world/monster-ai.js`,
  ren logikk: avstandskart over rutenettet, lukkede dører stenger; `view3d/monster.js` tegner
  det) og lydene (`audio/scary.js`). Det jakter bare når strømmen er borte (`Blackout`).
- **Gåmodus** jobber på en kopi av rommet (`cloneLevel` i `WalkMode.setWorld`), så dører
  man åpner med E ikke endrer rommet i editoren. Dører med rom på begge sider bygges som
  egne objekter som dreies om hengslet (`world/swing-doors.js`); lyset er bakt i
  editorstillingen.
- **Høyder** (`core/heights.js`): bruk alltid `ceilingAt` / `floorAt` / `topFloorAt` /
  `groundAt` / `depthAt`, aldri lagene eller `level.height` direkte. Taket holdes minst
  `HEADROOM` (2,1 m) over gulvet. Vannflaten ligger alltid i samme høyde
  (`WATER_SURFACE`), så gulvhøyde gjelder ikke vann.
- **`meta`** tilhører rutetypen og nullstilles av `setTile` når typen endres: dørblad for
  døråpninger (`core/doors.js`) og retning for trapper (`STAIR_DIRS`). For trapper er
  `floors` toppen; bunnen er toppen av ruten bak (`stairSpan`).
- **Lys er bakt per vertex** (`world/lighting.js`) med siktlinje gjennom rutenettet; der
  siktlinjen krysser en rutegrense må den gå under taket og over gulvet i begge ruter, og
  ikke gjennom en lukket dør.
  Blinkende lys bakes i egne kanaler (`aFlick`, 4 grupper) som animeres via uniforms.
- **Sprang i gulvet** (`world/surfaces.js`): den høyeste ruten eier den loddrette flaten mot
  naboen; vannruter eier bassengkanten opp til 0.
- **3D-oversikten** bruker backface culling som «dukkehus»: tak og nære vegger forsvinner
  når man ser ovenfra/utenfra. Ikke slå på `DoubleSide` på vegger/tak.
- **Vann** (`world/water/`): all vannflate ligger i samme høyde, så én `Reflector`
  (speiling) og én `Refractor` (lysbrytning) dekker alle bassenger. Geometrien ligger i et
  lokalt XY-plan (normal +Z) og roteres -90° om X. Speilingen er av i oversikten (taket
  ville ellers speilet seg) og kan slås av helt (`settings.waterReflections`).
- Hodeløs Chrome (SwiftShader) rendrer svært tregt (0,5–1,5 s per bilde) – vent lenge
  nok før skjermbilder i nettlesertester.
- Endringer i editoren bygger 3D-verdenen på nytt (debounced) – hold byggingen rask.
- **Ballbinger**: temaer med `pit: 'balls'` (lekerommet) tegner bassengruter som baller
  (`world/ball-layout.js` ren logikk, `world/balls.js` instansiert mesh) i stedet for vann.
