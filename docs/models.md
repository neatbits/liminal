# Importerte interiørmodeller

Kildene beholdes i `3dmodels/<navn>/` med original `license.txt`. Appen bruker bare de
optimaliserte `models/*.glb`. Ingen av modellene lastes ned før rommet bruker dem;
hver modell dekodes og bufres én gang per side. Geometri og lysdata kopieres fortsatt
per plassert møbel, så automatisk møblering skal være sparsom.

## Nye modeller

Alle tolv bruker CC BY 4.0. Tittel, skaper, kilde, skaperlenke og lisens er gjengitt fra
kildens lisensfil i `src/core/object-catalog-interiors.js`. `object-credit.js` lager
kreditering med merknad om skalering/optimalisering; `src/about.js` viser lenkene i Credits.
Fullstendige kildefiler beholdes i prosjektet. Geometri forenkles uten å endre silhuetten
vesentlig; teksturer reduseres til 512–1024 px WebP og geometrien bruker Meshopt.

| ID | Kildefil/mappenavn | Automatisk bruk | GLB, kB | Trekanter |
| --- | --- | --- | ---: | ---: |
| armchair | arm_chair | Kontor, hotell, kjeller | 930 | 19 959 |
| mug | coffee_mug | På pulter i kontor, skole, sykehus, hotell, kjeller | 75 | 1 032 |
| desklamp | office_desk_lamp | Samme pulter som koppen | 32 | 2 546 |
| moderndesk | office_desk_modern | Kontor, skole, sykehus | 194 | 12 343 |
| schoolcabinet | school_cabinet | Skolerom, utenfor skapgangene | 108 | 13 068 |
| whiteboard | whiteboard_standing | Kontor, skole | 64 | 12 204 |
| wallboard | whiteboard_wall | Kontor, skole; montert 1,05 m over gulv | 90 | 254 |
| hospitalbed | hospital_bed | Pasientoppsett på sykehuset | 625 | 18 899 |
| waitingchairs | hospital_chair_row | Sykehus (Mall bruker egen mallbench) | 69 | 14 166 |
| medicalscreen | hospital_curtain_emergency | Ved noen pasientsenger | 275 | 7 754 |
| medicalcabinet | hospital_medical_treatment_cabinet | Sykehusrom | 176 | 14 487 |
| medicaltrolley | hospital_medical_trolley | Ved senger og i sykehusrom | 71 | 10 273 |

Samlet: 104,49 MB originalmodell, geometri og teksturer → 2,71 MB GLB (97,4 % mindre).
Katalogmål er målt fra den faktiske geometrien etter `scale`/`turn`, med forsiden mot +z.
Skapet og skjermbrettet har skjeve lokale akser; behold deres korrigerte dreining.
Småting står ett om gangen på en pult, så automatisk møblering ikke plasserer dem i hverandre.
Dette er statiske møbler; de nye modellene har ikke løs fysikk eller animasjon.

## Butikkreoler

`store_empty_cosmetics_shelf` og `store_farmacy_shelf` er CC BY 4.0-modeller av vmmaniac.
Katalogen `object-catalog-mall.js` oppgir kilde, skaper, lisens og endringer. Modellene
heter Cosmetics display og Pharmacy display i objektvelgeren, med henholdsvis
3,128 × 2,272 × 0,391 m og 0,857 × 2,208 × 0,356 m (bredde/høyde/dybde).
Begge er dreid 180° for å vende mot +z. Mall plasserer dem i butikkene via
`gen/mall-shops.js`; de generelle møbleringsplanene brukes bare i gangene/atriet.

`scripts/retail-art.mjs` lager originale geometriske PALISADE-plakater, pakninger og
apotekskilt som del av `npm run models`. Opprinnelig logogeometri fjernes fra apoteket;
kildene endres ikke. `model.json.art: "retail"` aktiverer behandlingen, og endring i
art-skriptet utløser ny modellbygging. GLB-ene er ca. 212/129 kB med under 10 000
trekanter hver. `node scripts/preview-models.mjs --mall` viser størrelse og retning.
`model.json.instance: false` baker gjentatte hylledeler til eksplisitt geometri;
objektlasterens bakte lys håndterer ikke `EXT_mesh_gpu_instancing`.

## Retroelektronikk og minikjøleskap

Ni CC BY-objekter står i `object-catalog-electronics.js`. Hi-fi-anlegget inkluderer
egen benk. Walkman inkluderer kildefilens løse kassetter. Den nye VHS-spilleren er
«Vintage VHS Player 1» av Tejay21; den erstattet en NC-SA-kilde og kan brukes med
prosjektets CC BY-valg. De fire PC-ene kommer fra TheAlex' «80s / 90s Computer Pack».
Kildens tastatur/mus følger hvert relevant sett; hver maskin lastes som egen GLB.

`model.json.split` kan velge flere nodeprefikser per utfil (f.eks. `desktop` + `screen1`).
`scripts/electronics-art.mjs` erstatter OS-bilder, album/kassettkunst og merker med egne
PALISADE/DRIFT-motiver. `scripts/vhs-art.mjs` fyller den tosidige VHS-reolen med 210
fysiske bokser og tolv originale filmtitler/cover i ett delt atlas. Kildene beholdes.
Hi-fi/VHS-spilleren forenkles før komprimering; alle ni GLB-er er samlet under 1,6 MB.

Alle ni finnes i objektvelgeren. `gen/furnish-electronics.js` lager PC-/TV-utstillinger
i Mall; hyller/disksystemet setter inn VHS/WALKMAN. Kontor/skole velger mellom gamle
og fire nye PC-er på pulter. Båndspillere brukes sparsomt i de eksisterende pultoppsettene.
Minikjøleskap passer kafé, kontor, hotell og kjeller; hi-fi kan også stå i kjelleren.
`node scripts/preview-models.mjs --electronics` viser størrelser og retning i cache.

## PC-bord og støtteflater

`table` er Office Table av Konstantin Koretskyi (CC BY 4.0), optimalisert til ca.
66 kB. Skala 0,0125 gir 1,877 × 0,769 × 0,939 m og støtteflate 0,769 m over gulvet.
Den brukes i Mall-elektronikkbutikker og kontor-/skoleoppsett. `fullSupport` på de
fem PC-modellene krever at hele fotavtrykket ligger på bordplaten. `desk-items.js`
bytter en for grunn pult til dette bordet ved generering, med plasskontroll og
samme retning. `pc-support.test.js` dekker alle PC-er/retninger og relevante temaer.

## Utsatte modeller

`plastic_palm` er tatt ut etter brukerens ønske. `model.json.disabled` markerer den
som utelatt fra modellbygg, også med `--all`. Ingen GLB eller katalogoppføring
beholdes. Poolrooms bruker fortsatt `potted_palm_tree`.

Mall-benken og tre CC BY-planter står i `object-catalog-mall.js`; se [mall.md](mall.md)
for mål, temabruk og gulv-/butikkendringer. `potted_plant_01` har Sketchfab Standard
og holdes også utenfor med `model.json.disabled`, det samme gjelder `stop_sign_level_0`.

Etter brukerens valg holdes `book_shelf` (Sketchfab Standard) og `school_desk`
(CC BY-SA 4.0) utenfor. Ingen GLB, katalogoppføring eller automatisk plassering er laget.
Kildene er bevart, og `model.json.disabled` oppgir grunnen. Disse lisensene skal ikke
omtales som CC BY 4.0. Eventuell senere bruk krever at prosjektets lisensvalg vurderes først.

## Bygg og kontroll

- `npm run models -- arm_chair coffee_mug` bygger bare navngitte kildemapper.
- `npm run models` bygger nye/endrede kilder; `--all` tvinger ombygging av tillatte kilder.
  `model.json.disabled` gjelder også ved `--all`.
- `model.json`: `textureSize`, `simplify` og `simplifyError` styrer komprimeringen.
  `drop` fjerner noder, `split` deler en kilde i flere modeller. Se `scripts/models.mjs`.
- `node scripts/preview-models.mjs` lager en belyst kontaktoversikt med faktisk størrelse
  og retning i `node_modules/.cache/models.png` (bruker lokal Vite og ekte GPU).
- `npm test`: lisensmetadata, fil-/geometribudsjett, utelatte kilder, pultstøtte,
  monteringshøyde, romfil/deling, temabruk og plassering uten overlapp.
- `npm run test:browser -- --hardware`: tester produksjonsbyggets faktiske GLB-URL-er,
  alle 27 interiør-/Mall-/retromodeller i fire retninger, bounds mot kollisjonsbokser innen 1,5 cm, pultstøtte,
  shaderkompilering/kontekst og synlige krediteringslenker. Normal browser-sjekk kjører
  samme kontroller med SwiftShader. Skjermbilde: `node_modules/.cache/imported-models.png`.
  `check-bedding.mjs` kontrollerer også GPU-piksler fra sengens tosidige sengetøy;
  skjermbilde: `node_modules/.cache/bedding.png`.

Når katalogen utvides, gi objektene grupper/ikoner i `ui/object-info.js`, relevante
`PLANS`/oppsett i `gen/furnish.js`, og oppdater oversikten og testene. Automatisk
hjørneforming beskytter hele objektfotavtrykket, også tynne tavler over flere ruter.
Monterte gjenstander skal aldri bruke møbler som underlag i `core/object-pose.js`.

`world/object-light.js` baker eget lys og blinkekanaler for begge sider av `DoubleSide`-deler.
`object-shader.js` velger riktig side med `gl_FrontFacing` og ganger begge med `uTint`.
Dette unngår svarte trekantfelt på stoff der baksiden vender mot kameraet. Bare tosidige
deler får de ekstra attributtene/prøvene; ensidige deler beholder sitt gamle budsjett.
