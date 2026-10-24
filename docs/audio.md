# Fotsteg og kontaktlyder

## Stedbundne kilder

`audio/placed-sources.js` finner én kilde per faktisk fontene/rulletrapp og per
arkademaskin. `PlacedSourceMap` velger den sterkeste kilden av hver type, med høyst
to kandidater og sikttester per type fire ganger i sekundet. Avstand bruker tre
dimensjoner; hindringer bruker samme høydetest som lys, inkludert lukkede dører og
dekkeplater. Dørtilstanden oppdateres uten å bygge om hele kildekartet.

`placed-audio.js` har maksimalt tre mykt panorerte lavpass/gain-kjeder, koblet til
eksisterende trinnbuss/romklang og hovedvolum. Stemmeantallet vokser ikke med antall
maskiner. Nye nivåer nuller gamle kildevolumer; `_teardown` stopper/frakobler alle
noder. `AudioEngine.update` gjør ikke lydarbeid ved mute/pause/avsluttet gange.
Stillhet fra `AmbienceDirector` og `WalkMode.power` demper kildene sammen med resten.

`placed-buffers.js` lager originale åttesekunders looper: lavmælt vannstøy, 50 Hz
motor og en kort arkadefrase fulgt av stillhet. Ingen ekstra lydfiler lastes ned.
`test/placed-audio.test.js` tester geometri, dør/dekke-demping, retning, kildegrense,
signalnivå og sømmer ved ulike samplerater. `node scripts/check-placed-audio.mjs`
renderer den faktiske lydgrafen i OfflineAudioContext: stereoretning, demping,
stille perioder, rekkevidde, strøm, mute og pause. Ingen høyttaleravspilling.

## Fotsteg

`audio/footsteps.js` lager fire varianter per underlag og styrer nivå/pitch og
utgangsbuss. `audio/synth.js` re-eksporterer `footstepBuffers` for eksisterende kall.
Ingen lydfiler lastes fra nettverket.

Alle fottrinn får 0,15 × opprinnelig avspillingsforsterkning (omtrent −16,5 dB), uten
å endre resten av lydmiksen. Harde underlag får 18–22 ms anslag, svakere bassdunk,
lavere filtergrense og egen romklangssending på 0,3. Teppe og skum beholder sin
mykere klang, og volumparameteren til ekko-trinn ganges fortsatt med til slutt.

- Teppe: tekstur av myk friksjon med 30 ms avrundet anslag og lite bassdunk.
- Skummatter: dempet kompresjonslyd med 26 ms anslag, svakere tone og to filtre ved 350 Hz.
- Fliser og betong: fortsatt fastere underlag, men roligere anslag, nivå og filtrering.
- Vassing: roligere skvulp med 45 ms anslag, dobbel filtrering fra ca. 280 til 700 Hz,
  færre og svakere bobler, lavere topp-/avspillingsnivå og 0,55 s myk avslutning.
- Alle trinn fader ut til null for å unngå klikk ved bufferslutt. Teppe og skum
  normaliseres til 0,42, harde underlag til 0,52; materialforskjellen skal bevares.

Filterkoeffisienter beregnes fra Hz og `ctx.sampleRate`. Faste koeffisienter per
sample gjorde tidligere lyden skarpere ved 48 kHz enn ved 22,05 kHz. Ikke gjeninnfør
slike koeffisienter for de dempede kontaktlydene.

`AudioEngine._build` lager egne busser for teppe, skum og vassing, med samme direkte busnivå
som øvrige effekter, men romklangssending på henholdsvis 0,12, 0,16 og 0,28. Resten av
lydbildet beholder den vanlige `stepBus`. `_oneShot` kan få en egen utgang som fjerde
argument; undefined bruker vanlig buss. Ferdige kilder og gainnoder kobles fra.

## Gummiklosser

`world/softphysics.js` sender `onImpact(strength, x, z, material)` med `rubber` for
`def.soft`, `ball` for kuler og `plastic` for andre lette gjenstander. `SoftPlay`
fører materialet videre til `bump`, som re-eksporteres fra `audio/effects.js`.

`audio/contact-impact.js` lager en egen gummibuffer med 22 ms avrundet anslag,
dobbel lavpassfiltrering ved 320 Hz og kort hale. Buffere bufreres per lydmotor.
Styrken følger fallet; flere kontaktmeldinger innen 120 ms gir bare én gummilyd,
så en velting ikke summeres til et høyt smell. Gummi bruker skummattenes lydutgang.
Plaststoler og baller beholder sine tidligere støtlyder og styrkeskalering.
Bygningens fjerne dunk (`thumpBuffer`) endres ikke.

`enabled`, `playing` og `volume` bestemmer fortsatt faktisk avspilling. Verken mute,
pause eller avsluttet gåmodus skal kunne starte nye kontaktlyder. Ikke omgå motoren
med en separat AudioContext for en effekt.

Gjenstander som treffer vann bruker samme plasklyd som spilleren, med egen demping
etter masse/fart og avstand. `AudioEngine.splash(speed, gain = 1)` beholder tidligere
spillernivå som standard. Vannkontakt, ringer og kontroller: `docs/object-splashes.md`.

## Kontroll

- `npx vitest run test/contact-audio.test.js test/footsteps.test.js test/audio-engine.test.js`:
  anslag, endeklikk, nivå/filtrering ved 22,05/44,1/48/96 kHz, romklangsruting,
  støtbegrensning, ekte fysikkfall og pause/mute.
- `node scripts/check-contact-audio.mjs`: ekte OfflineAudioContext i Chrome med
  motorens fulle lydgraf og romklang. Måler signalet og bekrefter stillhet under
  pause/mute. Skriver WAV-prøver til `node_modules/.cache/audio-{carpet,foam,tile,water,rubber,plastic}.wav`.
  Ingen lyd sendes til høyttalere under testen. Den erstatter ikke subjektiv lytting
  på forskjellige hodetelefoner og høyttalere.
- `npm test` og `npm run test:browser` før endringer avsluttes.
