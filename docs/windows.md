# Vinduer og tematilpasset utsikt

Vinduer er fortsatt veggruter med `meta & 1`. Alle ruter beholdes i editor, lys,
kollisjon, angre, JSON og delingslenker. Romformatet er uendret.

## Store glassfelt i Poolrooms

Temaets `window` definerer `merge`, `flush`, `inset`, `depth`, `sill` og `head`.
Poolrooms har 2,5 cm sideavstand, glass 10 cm inne i veggen og en smal ramme som
starter i veggplanet. Det finnes ikke vindusbrett eller karm som stikker inn i rommet.
Brystningen er 45 cm og overkanten 3 m over gulvet, begrenset av taket minus 25 cm.

`core/windows.js` gir sideavstand null mot kompatible nabovinduer. Bare like
normaler, gulvhøyder og åpninger får dele glass. `world/surfaces.js` fjerner
veggstripene mellom slike ruter; `core/window-panes.js` samler dem til én flate for
`world/windows.js`. Dermed får glasset ett sammenhengende utebilde og én ytre
lysning, uten innvendige stolper. 2D-skissen viser også sammenhengende glassfelt.

`gen/windows.js` bruker egne Poolrooms-regler: 3–5 sammenhengende ytterveggruter
med like gulv/tak, 12–20 solide ruter mellom forsøk og 55 % sannsynlighet per forsøk.
Små eller oppdelte veggstrekk får ingen isolerte erstatningsvinduer. Håndmalte
vinduer bevares. Automatisk plassering gjelder nye rom; eksisterende vinduer får
den nye høyden/innfelte stilen og samles der de allerede ligger inntil hverandre.
Andre temaer beholder sin vindusplassering, sine høyder og sine karmer.

Solflekker beregnes per glassfelt. Brede flekker kontrollerer både lengde og bredde
i omtrent 20 cm steg, så de ikke hopper over smale vegger eller andre etasjer.
Dagslyset beregnes fortsatt per rute med eksisterende nabonormalisering.

## Utsikt per tema

`core/window-views.js` beskriver farger, terrengtype, høyde, avstand og bygningsstørrelser
som rene data. `windowViewFor` gir null for Level 0 og ukjente temaer; disse beholder
den gamle diffuse himmelen. `world/build.js` velger utsikt bare der et vindu finnes.
Vindusplassering, generering og lagrede romdata endres ikke av utsiktsprofilen.

| Tema | Uttrykk | Første rekke fra veggen |
| --- | --- | ---: |
| Playroom | Tomt gressområde, betongstriper, lave bygg med skråtak og noen trær | 48 m |
| Poolrooms | Første forslag: lys bassenggård, brede kanter og lave hvite bygg i dis | 62 m |
| Office | Kjølig byhorisont og høyere kontorbygg, sett fra et høyere plan | 65 m |
| Mall | Stor, tom parkeringsplass og brede, lave næringsbygg | 65 m |
| Garage | Grå parkering og enklere betongbebyggelse | 56 m |
| School | Tom skolegård, ballbane og lave skolefløyer | 55 m |
| Ward | Grønt gårdsrom, gangveier og lyse sykehusfløyer | 50 m |
| Hotel | Stillferdig gate, varmere bebyggelse og noen opplyste vinduer om natten | 50 m |
| Basement | Skjult, høy byutsikt over tette betongblokker, tak og gangbroer i dis | 42 m |

Avstanden gjelder rekkens sentrum; bygningenes fremside ligger litt nærmere.
Poolrooms-varianten er bevisst svak og diffus og har ikke vindusruter, bylys eller
aktivitet utenfor. Den er et utgangspunkt for visuell vurdering. Bakken antyder
stille vann med lys himmelfarge, uten en ny vannsimulering eller speilpass.

`world/window-landscape.js` bruker kameraets stråler til å treffe analytiske 3D-former.
Perspektiv og parallakse følger kameraets virkelige posisjon. Vinduer i
samme vegg deler koordinater. Himmel og lys følger alle fire tider på døgnet; noen
vinduer i bebyggelsen lyser svakt om natten, med tetthet per tema.

Dette er et virtuelt landskap i glassmaterialet, uten eksteriørmodeller eller ny
rendertekstur. Vanlige profiler har tre rader med tre bygningskandidater hver,
Basement har fem rader. Ingen raymarching,
ekstra scene eller renderpass. Det endrer ikke spillverdenen eller
lar spilleren gå gjennom vinduene. Ikke erstatt det med et bilde som følger kameraet.

## Mykere former og mer detaljer

- `landscape-shapes.js` har boks-, ellipsoide- og skråtakstreff. Playroom, School,
  Hotel får lave saltak; Office får inntrukne toppetasjer. Bygningenes
  plassering/avstand er beholdt. Playroom, School og Ward får sparsomt
  grønt med ujevne trekroner av fire overlappende ellipsoider. Poolrooms og Mall
  får ingen trær; Poolrooms beholder lave, flate og lyse bygg uten fasadevinduer.
- `landscape-surfaces.js` gir rolig skydekke, myke bakkevariasjoner, enkel
  kontakt-/slagskygge og retning på sollyset fra tidspunktet. Fasader får svake
  materialvariasjoner, sokkel-/takkanter, vindusfalser og himmelglans i rutene.
  Dette er en stilisert forbedring, ikke fotorealistiske modeller eller fysisk
  korrekte skygger/refleksjoner. Det fjerne bassengvannet er fortsatt en antydning.
- `landscape-shader.js` velger nærmeste treff før materialet beregnes. Tak, trær,
  inntrukne etasjer og fasadevinduer kompileres bort der profilen ikke bruker dem.
  Trekronene prøves først etter en billig omsluttende boks. Detaljene koster mer
  fragmentarbeid enn de gamle enkle boksene, men bare på synlig glass.
- `landscape-noise.js` lager en deterministisk 128 × 128 gråtonetekstur (16 KiB
  før mipkart) per materiale. Bilineær/mipfiltrert teksturstøy erstatter gjentatte
  sinusberegninger; vinduslinjer kantutjevnes med skjermderivater. Materialets
  `dispose` frigjør teksturen; prober som kloner materiale deler originalteksturen.
  Ingen nedlasting eller ny rendertekstur. Bildefrekvens må vurderes på fysisk GPU.

## Skjult byutsikt i Basement

Basement bruker `basement-city.js` og `basement-city-surfaces.js` som egen shader.
Gaten ligger 52 m under rommets nullplan. Fem rekker med tre kandidater hver gir
tette blokker i ulik høyde, inntrukne toppetasjer, takoppbygg, ventiler og enkelte
gangbroer, og omtrent 40 % runde tårn av to–tre stablede, smalere sylindre
(`drumHit`) med et dypt vindusbånd i skygge og lys brystning på hver etasje. Rundt
tårnet er det et helt antall vindusfag, og kantutjevningen regnes fra verdensposisjonen,
så `atan`-skjøten ikke synes. Blokkene er massive med få, små, firkantede vinduer.
Treffer testes analytisk; materialet beregnes bare for nærmeste flate. Støvete,
rosa-beige betong og sandfarget dis gir Babbdi-inspirert stemning uten å bruke
spillets modeller eller teksturer.

I Uncanny og Nightmare (stemninger med monster) står spøkelset av og til helt stille
ute i byen, 8–15 m fra veggen med midten omtrent i øyehøyde. Det er den samme modellen som
monsteret: `view3d/ghost-snapshot.js` tegner den én gang forfra (stillestående, tilfeldig
kledestilling) til et lite bilde med gjennomsiktig bakgrunn og mipmaps, og
`world/window-ghost-view.js` setter bildet i et loddrett plan i utsikten, med dis etter avstand.
UV-ens deriverte tas før alle greiner, og bildet slås opp med `textureGrad`. Det samme gjelder
alle temaer med vindusutsikt (landskapsshaderen), ikke Level 0, som bare har diffus himmel. `view3d/window-ghost.js` velger et
vindu man ikke ser mot, og lar det dukke opp mens man ser bort fra den veggretningen
(`world/window-ghost.js`), siden det synes gjennom alle vinduer i samme retning. Det er bare
et glimt: borte når man har sett mot det i 1,5–3,5 s (også mens man ser), eller etter 25 s usett.
`windowGhostProbe` kontrollerer for hvert tema at det tegnes utenfor riktig vegg og ellers ikke. Dag/natt følger samme
rominnstilling som andre vinduer. Nabovinduer deler koordinater. Profilen endrer
bare utsikten: `addWindows` lager fortsatt ingen vinduer i Basement, og den skjulte
utsikten viser seg ved manuelt malte vinduer, også i eldre lagrede rom.
`basementCityProbe` leser faktiske GPU-treffhøyder og kontrollerer gate langt under
spilleren og bygninger både over og under øyehøyde. Fire veggretninger testes.

## Direct3D-kompatibilitet

Bruk eksplisitte flyttall i GLSL-vektorer: `vec3(0.0, sign(p.y), 0.0)`, ikke
`vec3(0, sign(p.y), 0)`. Blandede heltalls-/flyttallskonstruktører i ulike
komponentrekkefølger utløste `vec3_ctor_int_int: ambiguous function call` i ANGLEs
Direct3D11-oversettelse på Intel-driver 32.0.101.8724. Det var ikke bare en svart
glassflate: konteksten gikk tapt og videre innlasting av simulatoren kunne blokkeres.
Feilen ble gjenskapt mot produksjon; eksplisitte flyttall retter den uten å endre utsikten.

SwiftShader godtok den feilende koden. Kjør derfor også tester med `--hardware`
ved GLSL-endringer. Den hodeløse nettleseren bruker fortsatt egen midlertidig profil.
Produksjonssjekken bekrefter tegnet 2D, linkede shaderprogrammer og levende WebGL-
kontekst for Office/Playroom/Poolrooms; konsollens shaderfeil gir testfeil.
Maskinvarekontrollen skal ikke godta programvarerendering som skjult reserve.

Playrooms sklier bruker vanlig plast: `slideIn` får `caustics: !theme.pit` i
`world/build.js`. Poolrooms beholder den animerte vannfilmen på vannskliene.

## Kontroll

- `npx vitest run test/pool-windows.test.js test/windows.test.js test/window-generation.test.js`:
  fire veggretninger, glassbredde/høyde, ingen fremspring/stolper, oppdeling ved
  endrede høyder/fjerning, lagring, sparsom generering og brede solflekker.
- `node scripts/check-windows.mjs`: ekte materialer i Chrome/SwiftShader, Poolrooms,
  Playroom dag/gyllen time/natt og tørr/våt sklie. En midlertidig prøveshader leser
  faktisk treffavstand og treffpunkt fra GPU for å verifisere dybde og kameraforflytning.
  Bilder: `node_modules/.cache/window-*.png`. Dette måler ikke fysisk GPU-bildefrekvens.
- `npx vitest run test/window-views.test.js`: valg/fravalg av profil, avstand til bygg,
  ulike omgivelser og sammenhengende plassering ved bytte mellom dag og natt.
- `node scripts/check-window-views.mjs`: alle profiler ved fire tider på døgnet, fire
  veggretninger, GPU-målt avstand/parallakse og åtte direkte GPU-prøver av skråtak,
  runde former og parallelle stråler. Valgfritt temafilter, f.eks. `pool office`.
  Bilder: `node_modules/.cache/view-*.png`; utsnitt av Poolrooms-forslaget:
  `node_modules/.cache/poolrooms-window-proposal.png`.
- `npm test` og `npm run test:browser` (inkluderer produksjonsbygg).
- `npm run test:browser -- --hardware` og `node scripts/check-window-views.mjs --hardware`:
  produksjonsflyter og alle utsiktsprofiler med maskinens faktiske grafikkdriver.
  Verifisert på Intel Graphics/ANGLE Direct3D11; dette dekker ikke alle GPU-er/nettlesere.
