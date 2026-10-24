# Liminal – prosjektregler

Liminal-simulator i three.js: brukeren tegner rom i en 2D-skisse (rutenett, 1 rute = 1 m),
ser dem synkronisert i en 3D-forhåndsvisning, og kan gå i rommet (`walkFullscreen` i viewer).
Esc pauser; Resume fortsetter; Esc på pause eller Exit går tilbake til editoren.
Fullskjerm brukes der det støttes, ellers fungerer gåmodus i panelet.
Rom kan lagres lokalt, eksporteres som JSON og deles som lenke (`#room=...`; gamle
`#rom=`-lenker og formatnavnet `liminal-rom` leses fortsatt).
Vanlig oppstart viser New room; «Continue current room» beholder utkastet bak dialogen.
Delte rom og eksempellenker åpnes direkte uten oppstartsdialog.

Tre sider (Vite multi-page): forsiden `index.html` (`src/landing.js`, eksempelkort og
reklameplass `#ad-slot`), simulatoren `app/index.html` (`src/main.js`) og
`about/index.html` (`src/about.js`, personvern og kreditering). Forhåndsbildet for lenker er
`public/og-image.jpg` (lag nytt med fotomodus, `view3d/photo.js`, i 1200 × 630). Gamle lenker til
roten med `#room=`/`#rom=` sendes videre til `app/`; `app/#example=<id>` åpner et eksempel.

## Kommandoer

- `npm run dev` – utviklingsserver (Vite, port 5180)
- `npm test` – kjør alle tester én gang (Vitest)
- `npm run test:watch` – tester i watch-modus
- `npm run test:feedback` – PHP 8+-tester av e-post og spambeskyttelse uten ekte sending.
  Bruk `PHP_PATH` hvis PHP ikke ligger på PATH. Se `docs/feedback.md` for drift og publisering.
- `npm run test:browser` – bygger og tester import, lagring, deling, dialogfokus og pause i
  hodeløs Chrome/Edge. Ved GLSL-endringer: kjør også `npm run test:browser -- --hardware` på ekte GPU; sett `CHROME_PATH` ved behov (Node 22+).
  Bruker en egen, midlertidig profil i `node_modules/.cache/`, uten å berøre vanlige nettleserdata.
- `npm run build` – produksjonsbygg til `dist/`
- `npm run deploy` – tester, bygger og laster opp `dist/` over SFTP (tilkobling i
  `.env.deploy`, se `deploy.example.env`; `--dry-run`, `--clean`, `--env <fil>`)
- `npm run models` – gjør kildemodellene i `3dmodels/<navn>/` (glTF) om til komprimerte
  `models/<navn>.glb` (bare endrede; `--all` for alle; mappenavn velger bestemte). Forbehandler spec/gloss → metal/rough,
  emissive-teksturer uten fargetekstur, og `model.json` med `drop` (fjern deler), `textureSize` og
  `simplify` (andel trekanter for tunge modeller) og `split` (én fil med flere modeller → én .glb
  per modell; lisensen ligger i kildemappen). `disabled` utelater kilder også ved `--all`. Se `docs/models.md`. Sjekk alltid
  størrelse (`scale`) og retning (`turn`) visuelt – modeller fra Sketchfab har ofte rare enheter.

Publisering (liminalsimulator.com, neatbits.no/liminal/): last opp *innholdet* i `dist/`
(`index.html`, `app/`, `assets/` og `.htaccess`), aldri prosjektrotens HTML-filer – de peker
på `/src/…` og virker bare via Vite. Bygget bruker relativ base (`./`), så det fungerer i en
undermappe. `public/.htaccess` sender http:// videre til https:// (Apache hos one.com).

## Faste regler

1. **Små filer: maks 200–250 linjer per fil.** Nærmer en fil seg grensen, del den opp
   etter ansvar før du legger til mer. Gjelder også CSS og tester.
2. **Endringslogger skal vedlikeholdes.** Bruker- og arkitekturendringer føres detaljert i
   `CHANGELOG.md` under `[Ukommet]`; ved versjonsbump flyttes de til en datert versjonsseksjon.
   Offentlig «What's new» i `about/index.html#changelog` får bare store nyheter og vesentlige
   brukerforbedringer: 3–5 korte engelske punkter per utgave, uten småfikser, refaktorering eller tester.
   Samle upublisert arbeid under «Coming next»; gi det versjon og dato først ved faktisk publisering.
3. **Testing via Vitest.** Ny eller endret logikk i `src/core`, `src/gen` og den rene
   delen av `src/world` skal ha tester i `test/`. Kjør `npm test` før du sier deg ferdig.
4. **Ren logikk holdes fri for DOM og three.js** (`src/core`, `src/gen`,
   `src/world/lighting.js`, `src/world/collision.js`, `src/world/floaters.js`,
   `src/world/ball-layout.js`, `src/world/monster-ai.js`, `src/world/paths.js`,
   `src/world/autopilot.js`, `src/world/windows.js`, `src/view3d/flicker.js`,
   `src/view3d/events.js`, `src/audio/acoustics.js`, `src/audio/director.js`,
   `src/world/softphysics.js`, `src/world/anomalies.js`, `src/world/lamp-map.js`,
   `src/world/shifts.js`, `src/world/ripples.js`, `src/world/light-grid.js`, `src/world/wayfinding.js`, `src/world/chunks.js`,
   `src/world/sightline.js`, `src/world/window-ghost.js`) slik at den
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

## Videre arbeid og regresjoner

- Les `git status` og relevante filer først. Arbeidsområdet kan inneholde upublisert arbeid
  fra både brukeren, Claude og Codex; bygg videre på dette uten å tilbakestille andre endringer.
- Kjør målrettede tester underveis, deretter `npm test`. Kjør produksjonsbygg og
  `npm run test:browser` ved endringer i lagring, brukerflyt, pause, input eller rendering.
  Nettlesersjekken bygger selv. I Windows PowerShell kan `npm.cmd` brukes hvis `npm.ps1` er blokkert.
- Bekreft hva som er testet og hva som gjenstår. Blokkert WebGL må bevare 2D/lagring (`docs/graphics-recovery.md`). Shaderfeil/konteksttap skal feile nettlesersjekken; bruk flyttall i GLSL-vektorer. Node-tester og SwiftShader sier ikke hva
  bildefrekvensen blir på en fysisk GPU eller hvordan native fullskjerm virker på mobil/Safari.
- **Romformat v3**: sonelag er rå byteverdier som to heksadesimale tegn per rute (`00` = standard).
  Les fortsatt v1/v2 med ett tegn per rute. Endre `VERSION` ved inkompatible formatendringer;
  behold gamle innlesere. Test hele lovlige høydeområdet via JSON, delingslenke og lokal lagring
  (`serialize-heights.test.js`, `storage.test.js`), særlig når høydegrenser eller lag endres.
- **Lagring**: suksess krever en faktisk skriving. Manglende/blokkert/full lagring skal gi
  feil; ødelagte romlister skal ikke overskrives automatisk. Nye rom får id etter vellykket lagring.
  `app/draft.js` lagrer ved `pagehide`/skjult fane og varsler ved feil; behold dette ved refaktorering.
- **Historikk**: tomme strøk skal bevare både angre og gjør-om, også ved full stakk.
  Avslutt strøket med `dropIfUnchanged`; sklie-/objektlistene må fortsatt være immutable.
- **Pause**: `WalkSession` styrer input, pointer lock, berøring og lyd. Når `walk.paused` er sann,
  stopper simuleringstiden, fysikken og utforskingshendelsene; ventende nivåoverganger fryses
  og avbrytes ved utgang. PC viser gålinjen kun på pause; berøring beholder den. Test Resume uten pointer lock og berøring uten muselås.
- **Lyd**: faktisk volum bestemmes av `enabled`, `playing` og `volume` i `AudioEngine`.
  Innstillingsendringer må aldri starte lyd etter mute, pause eller utgang fra gåmodus. Fotsteg/gummiklosser og lydkontroll: `docs/audio.md`.
- **Dialoger**: hold tastaturfokus i åpen modal og gi fokus tilbake ved lukking.
  **Ytelse**: rom med minst 4096 ruter venter med full 3D-bygging til penselen hviler;
  små rom har løpende forhåndsvisning. Mål før større endringer i lys/geometri eller flytting til worker.

## Arkitektur

**Tilbakemeldinger**: `ui/feedback.js` deler Suggestions-dialogen mellom alle tre sider.
`public/api/feedback.php` sender til hello@liminalsimulator.com via webhotellets PHP `mail()`;
`feedback-lib.php` validerer og begrenser sending. PHP-filene må følge bygget til serveren.
Test både `npm run test:feedback` og nettlesersjekken ved endringer her. Se `docs/feedback.md`.

```
src/
  core/      romdata (level), serialisering, lagring, historikk, verktøyoperasjoner, temaer
  gen/       prosedyregenerering av rom og ferdige eksempler
  world/     bygger 3D-verden fra et rom: geometri, bakt lys, materialer, armaturer, kollisjon
  textures/  prosedyrelle canvas-teksturer per tema (ingen eksterne bildefiler)
  view3d/    renderer, kamera (oversikt/topp/gå), etterbehandling, input, HUD
  audio/     prosedyrell lyd (lysrørsurr, ventilasjon, fottrinn, romklang som følger rommet,
             bakgrunnslyder over tid: director.js bestemmer når, ambient.js lager lydene;
             musikken: alle mp3-er i music/ via import.meta.glob, music.js spiller dem i loop)
  editor/    2D-skissen: viewport, tegning, input
  ui/        toppmeny, sidepanel, modaler, toasts
  landing.js forsiden
  styles/    CSS delt per område
```

- **Romformat** (`core/level.js`): alle lag i `LAYERS` (`tiles`, `lights`, `ceilings`,
  `depths`, `floors`, `finish`, `meta`, `decks`, `corners`) er `Uint8Array(w*h)`, indeks `z*w+x`. Utenfor kartet regnes
  som vegg. Verdensenhet = meter, x = kolonne, z = rad. Nye lag legges i `LAYERS` (da
  følger kopiering, størrelsesendring og angre med) og i `LAYERS` i `serialize.js`.
- **Skrå og avrundede hjørner** (`core/corners.js`, laget `corners`): en gulvrute med vegg på to sider som
  møtes (innvendig hjørne) eller en veggrute med gulv på to slike sider (utvendig) kan formes; grensen går
  mellom nabohjørnene (rett eller kvart sirkel), og delen mot hjørnet får naboenes type. Bruk alltid
  `cornerShape` (sjekker at formen fortsatt passer) – geometri `world/corners.js`, kollisjon
  (`pushFromPolygon`), lys (`openPoint`), generering `gen/corners.js` (bare med vary). UV og tester: `docs/corners.md`.
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
  `level.objects` = [{ id, x, z, rot }], som sklielisten aldri endret på stedet. Posituren
  (`core/object-pose.js`) regnes ut med `poser(level)`, som husker hver gjenstand innenfor ett kall –
  bruk den i løkker over mange gjenstander (stablingen gjør `objectPose` alene kvadratisk). Ny modell:
  legg glTF i `3dmodels/<navn>/`, kjør `npm run models`, og legg en oppføring i `OBJECTS`
  (size = utstrekning i meter etter `scale`, forsiden mot +z – bruk `turn` om modellen vender
  feil), og gi den gruppe og ikon i `ui/object-info.js` (objektvelgeren). Bruk bare CC0/CC-BY-modeller (siden har reklame) og før opp kreditering i `credit`;
  CC BY krever i tillegg `attribution` (tittel, kilde, skaper, lisens med lenker – About-siden
  viser det); bruk `...ccBy(tittel, skaper, kilde, skaperUrl)` fra `core/object-credit.js` i katalogen. Nye interiører: `object-catalog-interiors.js`, `docs/models.md`. Behold lisensfilen i `3dmodels/<navn>/`. Teksturer med andres varemerker eller kunst (logoer, spillfigurer) males
  om med egen grafikk (som arkademaskinen: `scripts/arcade-art.mjs`), og endringen føres i
  `attribution.changes`. 3D-delen (`world/objects.js`) laster .glb
  asynkront, sentrerer modellen og baker rommets lys per vertex. `surface` (høyde) gjør en
  gjenstand til en flate andre settes oppå; `floats` lar den ligge i vann, og i gåmodus
  dyttes slike rundt (`world/floaters.js` via `view3d/water-play.js`). Med `build` i stedet for
  `file` bygges gjenstanden av enkle former i `world/props.js` (variant per tema/rute via
  `propKey`); deler med `unlit` lyser av seg selv (skilt, lyskasser).
  `walk` (stupebrettet) gjør en stripe langs gjenstanden til en flate man går på (`core/object-walk.js`:
  `objectGround` for gange/klatring, `walkBlockers` for kollisjon; slike gjenstander snus aldri av
  andre), og `shift` flytter gjenstanden fram fra ruten.
  `mount: 'ceiling'|'wall'` (+ `lift`) henger gjenstanden under taket eller på veggen bak, `spin`
  får den til å snurre (takvifte). `soft` = lekeklosser: de
  stables på klossene før seg i listen, er ikke faste hindringer, og i gåmodus styres de av
  fysikk (`world/softphysics.js` med cannon-es, lastet dynamisk av `view3d/softplay.js`).
  `loose` gir lette gjenstander fysikk uten stabling: `parts` = bokser, `radius` = kule. Lekeballer:
  se `docs/play-balls.md` for 48-grense, hybridbinger og tester. Spillerkroppen må aldri sove.
- **Rekkverk** (`core/railings.js`): reglene for hvilke kanter som får vern/håndlist brukes
  både av geometrien (`world/railings.js`) og kollisjonen – endre dem bare der.
- **Vannsklier** (`core/slides.js`): `level.slides` er en liste med objekter
  `{ points: [[x, z], …], tube }` oppå rutenettet. Listen og objektene endres aldri på
  stedet – lag en ny liste (angre sammenligner med `===`, og banene bufres per objekt).
  `slidePath` gir den glattede banen for 3D (`world/slides.js`, `slide-shell.js`), kollisjon, 2D og
  skliingen (`view3d/rider.js`). Innløp, platåklaring og hel røråpning: `docs/slides.md`; behold samme bane for alle.
- **Utforsking** (`view3d/explore.js`): VHS-kassetter (`gen/tapes.js`, `view3d/tapes.js`),
  strømbrudd (`view3d/events.js`, demper via `world.setPower`) og uendelige nivåer: en dør
  til ingensteds i gåmodus kaller `walk.onExit` → `gen/endless.js` lager neste nivå, som
  vises med `viewer.setLevel(level, { explorer: true })`; rommet fra editoren (`home`) settes
  tilbake når man går ut. `generateLevel` legger inn utganger (`gen/exits.js`), også i
  ytterkanten – kanten er da vegg eller en lukket dør til ingensteds – og gjenstander etter
  temaet (`gen/furnish.js`, `PLANS`). Begge har eget frø, så romoppsettet er uendret.
  Størrelsen på nye nivåer følger `settings.levelSize` (`gen/sizes.js`: grunnstørrelse per tema × skala).
  Takhøyde og bassengdybder varieres (`gen/variety.js`, eget frø; `vary: false` for eksemplene),
  og `gen/door-space.js` rydder dører og gjenstander som er i veien for hverandre.
  Kassettjakt (`view3d/tape-hunt.js`): på genererte nivåer er dørene til ingensteds låst til alle
  kassettene er funnet (`exitsLocked`), kassettene summer (`audio/tape-hum.js`), og kassetter legges
  bare der man kan gå (`reachableCells`). Fremgang: `loadProgress`/`saveProgress`.
- **Vinduer** (`core/windows.js`): en veggrute med `meta & 1` er et vindu – fortsatt vegg for
  kollisjon, lys og dører. `level.sky` (SKIES) gir himmel, dagslys (lyskilder med egen farge,
  `rgb`) og solflekker (`sunPatch`). Innfelte Poolrooms-glassfelt, temautsikt og landskapsdetaljer (`core/window-views.js`): `docs/windows.md`; sprosser er eksplisitt tilvalg.
- **Korridorbygg** (`gen/building.js`): skolen og sykehuset. Korridorene på skolen får belegg
  (`finish`), og temaets `tiles` tegner belegget som skap – samme triks kan brukes for andre
  vegger med eget utseende i deler av et bygg.
- **«Make it wrong»** (`gen/wrong.js`): katalogen `CHANGES` med små endringer (hver returnerer
  `{ what, cells }` eller null), vektet (`WEIGHTS`) og begrenset (`MAX`). Nye endringer skal være
  subtile hver for seg, aldri skumle, og ikke dele rommet i to (testen sjekker at det henger sammen).
- **Drømmegange** (`view3d/drift.js` + `world/autopilot.js`): autopiloten bruker
  `world/paths.js` (som monsteret) og går gjennom dører til ingensteds via `walk.onExit`.
- **Romlige avvik** (`world/anomalies.js`, ren logikk): `findLoops` finner rette ganger der
  alle lag og gjenstander ±3 ruter gjentar seg med periode L; `Loops` (i `WalkMode`) flytter
  gåeren `loopShift` (multiplum av L som går opp i teksturene, `textureRepeats`) når den krysser
  midten. Korridornivåer: `gen/corridors.js`; «samme rom igjen» og dør tilbake: `gen/endless.js`
  og `view3d/explore.js`.
- **Stemningen** (`gen/moods.js`, `settings.mood`): MOODS styrer tåke/eksponering (viewer
  `_applyLook`), ødelagte lys, mørke deler (`dark`, `gen/darkness.js`) og «Make it wrong» (`moodLevel`, brukt av `view3d/explore.js` på en
  kopi av rommet), avvik (`walk.mood.anomalies`, `nextLevel`-odds), strømbrudd, skumle lyder og
  monsteret. Nye liminale/skumle effekter skal kobles til skalaen her.
- **Hendelser bak ryggen** (`world/shifts.js`, ren logikk): `Shifts` husker dører og lys man har
  passert og velger en endring (`KINDS`: doorWall, lightOut, objectTurn, doorClose) som bare skjer
  bak spilleren (`behind`) og aldri stenger en inne. `view3d/shifts.js` bygger verdenen på nytt fra
  en kopi av `walk.level` (Explorer setter `home`, så editorrommet kommer tilbake). Nye typer: legg
  dem i `KINDS` – subtile, aldri skumle hver for seg.
- **Monsteret** (Uncanny/Nightmare): `view3d/scary.js` styrer monsteret (`world/monster-ai.js`,
  ren logikk: avstandskart over rutenettet, lukkede dører stenger; `view3d/monster.js` tegner
  det) og lydene (`audio/scary.js`). Det jakter bare når strømmen er borte (`Blackout`).
- **Gåmodus** jobber på en kopi av rommet (`cloneLevel` i `WalkMode.setWorld`), så dører
  man åpner med E ikke endrer rommet i editoren. Dører med rom på begge sider bygges som
  egne objekter som dreies om hengslet (`world/swing-doors.js`); lyset er bakt i
  editorstillingen. Beslagene (vridere/knotter, hengsler, sparkeplate) lages i `world/door-hardware.js`;
  temaets dørstil har `handle` ('lever' | 'knob') og `kick`.
- **Høyder** (`core/heights.js`): bruk alltid `ceilingAt` / `floorAt` / `topFloorAt` /
  `groundAt` / `depthAt`, aldri lagene eller `level.height` direkte. Taket holdes minst
  `HEADROOM` (2,1 m) over gulvet. Vannflaten ligger alltid i samme høyde
  (`WATER_SURFACE`), så gulvhøyde gjelder ikke vann.
- **`meta`** tilhører rutetypen og nullstilles av `setTile` når typen endres: dørblad for
  dører og retning for trapper (`STAIR_DIRS`, bit 0–1); rulletrapp = bit 2, nedover = bit 3.
  Trappens `floors` er toppen, bunnen kommer fra `stairSpan`. Manuelt Escalator-verktøy (E, opp/ned), motor, GPU-trinn og Mall-dekorbasseng: `docs/escalators.md`.
- **Lys er bakt per vertex** (`world/lighting.js`) med siktlinje gjennom rutenettet; der
  siktlinjen krysser en rutegrense må den gå under taket og over gulvet i begge ruter, og
  ikke gjennom en lukket dør.
  Armaturen sitter i høyden `top` = min(tak, gulvet under + `HANG`): i høye rom henger den i en ledning
  (`world/fixtures.js`); `ceil` er fortsatt taket.
  Blinkende lys bakes i egne kanaler (`aFlick`, 4 grupper) som animeres via uniforms.
  Lysfargen (`level.tint` / `settings.light`, `core/tints.js`) bakes ikke: den ganges inn i `vLight`
  via den delte uniformen `uTint` (og armaturene/glansen), regnet ut hver ramme i viewer. Nye shadere
  med bakt lys må gange inn `uTint`.
  Blanke fliser (`gloss` på en flate i temaet) speiler armaturene i shaderen via et kart over
  armaturene (`world/lamp-map.js` → `world/gloss.js`), uten ekstra tegnepass. Poolrooms har dempet glans/glød i temaet; juster lokalt, ikke globalt.
- **Sprang i gulvet** (`world/surfaces.js`): den høyeste ruten eier den loddrette flaten mot
  naboen; vannruter eier bassengkanten opp til 0.
- **3D-oversikten** bruker backface culling som «dukkehus»: tak og nære vegger forsvinner
  når man ser ovenfra/utenfra. Ikke slå på `DoubleSide` på vegger/tak.
- **Vann** (`world/water/`): all vannflate ligger i samme høyde, så én `Reflector`
  (speiling) og én `Refractor` dekker alle bassenger. Absorpsjon bruker synlig geometri fra brytningsdybden (`water/refraction.js`); ringer (`world/ripples.js`, fra
  `view3d/water-play.js`) går til shaderen som `uRipples`; gjenstandsplask: `docs/object-splashes.md`. `settings.waterDetail` gir flere småbølger og full oppløsning. Geometrien ligger i et
  lokalt XY-plan (normal +Z) og roteres -90° om X. Speilingen er av i oversikten (taket
  ville ellers speilet seg). `waterReflections` slår speiling av/på; `waterWaves` (0–2, standard 1) styrer kun bakgrunnsbølger via `setWaves`; plaskringer vises også ved 0.
- **Grafikkinnstillinger** (`ui/settings-dialog.js`): `fullscreenAspect`, `renderScale`, `effects`, `fpsCap`, vann
  (`waterReflections`/`waterDetail`). Størrelse, format og bildefrekvens styres i `view3d/display.js`
  (`resizeView`, `frameDue`); effektnivået i `postfx.setQuality`.
- Hodeløs Chrome (SwiftShader) kan bruke 0,5–1,5 s per bilde; vent før skjermbilder.
- **Ytelse og utseende**: se `docs/performance.md` for målinger, lyscache, renderkontroll og Level 0s renere teksturer (egen himling, ikke den delte).
  Behold tapsfrie lysnøkler og del `poser` mellom modeller. Vinduer/skilt samles per materialgruppe.
  Faste gjenstander tegnes samlet (`world/object-batches.js`): det som flyttes (fysikk, flyter, snurrer) må holdes utenfor.
  Modelldeler slås sammen ved lasting (`object-parts.js`, atlas/palett); gjenstander bakes med `objectSample`, flater med `sample`.
  Editorbygging strupes/debounces; three.js har egen cachebar byggpakke (`vite.config.js`).
- **Ballbinger**: `pit: 'balls'` tegner bassengruter som baller (`world/ball-layout.js`, ren logikk).
  `world/balls.js` bruker instansgrupper (`chunks.js`), impostorer lenger unna enn 6 m (`ball-shaders.js`); behold bounds/frigjøring. Løse fysikkballer: `docs/play-balls.md`; måling: `docs/performance.md`.
