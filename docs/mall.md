# Mall: butikkfronter, planter og gulvspeiling

## Oppsettfamilier og nisjepaneler

`gen/mall-shop-layout.js` bygger Gallery, Cross Court og Terraces. `generateLevel`
velger oppsett fra frøet i store tilfeldige Mall-rom; `layout` kan velge eksplisitt.
`vary:false` beholder Gallery med mindre oppsettet er valgt eksplisitt (`auto`
velger fra frøet). Det offentlige Mall-eksempelet trekker nytt frø og bruker `auto`;
forsiden, Examples og telefonvelgeren har bare ett Mall-kort. Små rom uten returarkader
eller under 48 ruter brede bruker Gallery. Gamle lenker til `mall-cross-court` og
`mall-terraces` åpner fremdeles faste rom (64 × 44, frø 7). Romformatet er uendret.

Cross Court åpner et syv meter bredt felt gjennom begge butikkbåndene og binder
returarkadene til galleriene. Terraces trekker annenhver egnet butikkfront én–to meter
inn, tilpasset butikkdybden med minst fire meter igjen. Standardrom på 52 × 38 og
56 × 40 får én meter; store rom får to. Gulv, dører, skilt og møbler
følger de faktiske butikkgrensene. `mall-traffic.js` finner gjennomgående gulvstriper
og beskytter tre meter gjennom midten mot automatisk møblering.

Vindusnisjenes sidepaneler får en bakside 4 cm inn mot den massive naboveggen,
med motsatt omløp/normal og eget bakt lys. Ved åpne butikkdører bygges panelet 4 cm
inn i vindusfeltet med en egen flate på begge sider, og den ordinære ensidige
inngangsveggen utelates. Inngangsbredden beholdes. Vanlige vegger beholder backface-culling.
`shopfront-floors.test.js` og `check-shop-panel-backs.mjs` kontrollerer begge ender,
begge butikkretninger og begge etasjer. Sistnevnte bruker en cyan GPU-markør fra
baksiden av panelet, og ville ikke passert med den opprinnelige ensidige flaten.

`mall-layouts.test.js` kontrollerer sammenheng, møblering, determinisme og lagring.
`check-interior-polish.mjs` åpner begge gamle variantlenker i produksjonsbygget og lagrer
`mall-cross-court.png` og `mall-terraces.png` under `node_modules/.cache/`.

## Butikkmaterialer og retro-utstillinger

`core/shop-interiors.js` finner innredningssonene fra de lagrede fasadeprofilene.
Flomfyllingen starter samtidig fra alle butikkfronter og krysser bare ferdigbelegg
på gulv/søyler. Gangene, vindusnisjene og umerkede finish-soner beholder tidligere
materialer; åpnes en skillevegg mellom butikker, velges nærmeste front stabilt.
Ingen ny serialisert tilstand. Redigering og gjenåpning beregner kartet på nytt.

| Profil | Gulv | Vegg |
| --- | --- | --- |
| Arkade | Mørkt, kornet romteppe med egne stjerner, kometer og planeter | Koksgrått/lilla med svart panel og blå/lilla bånd |
| Elektronikk | Blågrå tekniske fliser | Kjølige sporpaneler og mørk brystning |
| Varebutikk | Store kremfargede porselensfliser | Varmhvit puss og trepanel |
| Kafé | Krem/terrakotta-ruter | Varmhvit puss og burgunder flisbrystning |

`surfaces.js` fordeler eksisterende geometri på tolv materialegrupper (tre per type),
inkludert gulv/himling over/under dekker. Gulvene er opake, uten ekstra overlagte plan.
`floor-reflection.js` skjuler også disse gulvgruppene i speilpasset. Vindusnisjenes
gulv og sideflater holdes intakte. `Walker.reset` beregner fottrinnskartet én gang;
arkade får teppetrinn, de tre andre flisetrinn. Ukjente/umarkerte rom beholder fallback.

Elektronikkbutikkene har hi-fi-anlegg med egen benk, PC-er på dype bord, TV-er på lave benker, Walkman
og VHS-spiller på disker. VHS-reolen har 210 bokser med tolv fiktive filmcover og
plasseres langs sideveggen i elektronikk-/varebutikker når fotavtrykket passer.
Kaféen kan få minikjøleskap. Import og øvrig temabruk: [models.md](models.md).

`shop-interiors.test.js` kontrollerer avgrensning, lagring, geometri i begge etasjer
og fottrinn. `check-shop-interiors.mjs` sammenligner faktiske GPU-piksler med alternative
gulv-/veggkart, i fire butikker og øvre arkade. Bilder: `mall-shop-arcade.png`,
`mall-shop-arcade-upper.png`, `mall-shop-tv.png`, `mall-shop-shelves.png`, `mall-shop-cafe.png`.

## Glasstak, fontener og sidearkader

`core/mall-roof.js` finner atriets åpne område fra rommets gulv/dekker. En høy Mall-hall
med tilstrekkelig plass får et mønetak med opptil 1,6 m stigning over vanlig takhøyde.
`world/mall-roof.js` bygger begge takfall, glassgavler, sprosser og rosa lyslister.
`surfaces.js` utelater vanlig himling under dette feltet; resten av taket beholdes.
`roof-glass.js` viser rommets himmelfarger med svak dis. `collectLights` erstatter øvre
taklamper i feltet med sparsomme dagslyskilder; armaturer under dekket beholdes.
Den vanlige takhøyden er fortsatt en konservativ øvre grense for gange/hopping.

Begge trekantgavler har en mørk tverrbjelke langs underkanten, 20 × 24 cm, som
overlapper skråsperrene og avslutter glasset mot vanlig himling. Takrammen bruker
mørk antrasitt. Himmelen følger synsretningen på tvers av glassfeltene, med flere
skylag fra en lokalt generert 128²-støytekstur, eksisterende døgnfarger og justert
eksponering. Ingen HDRI lastes ned. Materialets støytekstur frigjøres ved dispose.
`check-roof-ends.mjs` lagrer `mall-roof-end-full.png` og `mall-roof-end-reduced.png`.

`core/fountain-jets.js` finner sammenhengende Mall-vannflater og velger ett sentrum i
vannet nær arealets tyngdepunkt. Nedslagsradius testes rundt hele sirkelen mot basseng
og steinkant, og strålehøyden begrenses av rommets tak/dekke. Vannflater under fire
ruter utelates. `world/fountain-spray.js` tegner 864 GPU-dråper per basseng, med én høy
midtstråle og åtte lave buer, pluss ringer på vannflaten. Partiklene bruker analytiske
baner og delt `uTime`, så pause, gjengivelse i speil og ombygging trenger ingen ny
fysikksimulering eller renderpass. Bounds dekker hele banen, og ressursene frigjøres.

`gen/mall-arcades.js` gir store Mall-rom (minst 40 ruter brede og tilstrekkelig butikkdybde)
tre meter brede returarkader bak butikkene, brede tverrplasser og endepassasjer. Man kan
gå rundt butikkblokkene med 90-graders svinger i begge etasjer. `mall-traffic.js` holder
returgangene fri for møbler, i tillegg til innganger og rulletrappearealer. Den nye
planløsningen gjelder nye rom/eksempler; eksisterende rom beholder tegningen og får
glasstak/sprut når geometrien passer. Ingen endringer i romformatet.

`mall-atrium.test.js` dekker tak, dagslys, lagring, nedslag i ujevne bassenger, sammenheng
og faktiske gåturer rundt begge etasjer med møblene på plass. `check-mall-atrium.mjs`
kontrollerer shaderkompilering, forskjell mellom lyst/mørkt glasstak, synlige dråper,
animasjon og pause i GPU-piksler. Forhåndsbilder i cache: `mall-skylight.png`,
`mall-fountain.png` og `mall-side-arcade.png`. Kostnaden måles med den vanlige GPU-sjekken.

`gen/mall.js` lager butikkene og reserverer to meter til åpne innganger. `core/shopfronts.js`
holder butikkprofiler og leser frontene fra eksisterende metadata: bit 1 på vegg/gulv er
butikkfront, bit 2–3 er profil. Dørers metadata beholder vanlig betydning. V3-romfiler,
delingslenker, kloning og angre bevarer dette uten formatendring. `setTile` nullstiller
metadata ved endret rutetype. Hjørnegenereringen beskytter frontene.

`world/shopfronts.js` bygger glass, metallrammer, fasciabånd, skilt og gulv/himling gjennom
veggfeltene i begge etasjer. `surfaces.js` utelater de opake flatene foran glasset. Glassfelt
forblir vegg i kollisjonskartet; inngangene er gulv. Enkeltfelt etter redigering bygges også.
Glassmaterialet bruker gjennomsiktighet uten dybdeskriving og et svakt vinkelavhengig skinn.
Fire butikkprofiler gir varehus, elektronikk, arkade og kafé, med egne skilt i hver etasje.

Glassfeltet åpner hele dybden i veggruten. `shopReveal` lukker derfor endene mot massive
veggpilarer og områdene over tilstøtende dører, med riktig synlig side i begge retninger.
Lukkingen dekker også dekkets tykkelse; ellers kan skrå siktlinjer gå inn i veggen og ned
til etasjen under. Øvre dørterskler har sammenhengende gulv og underside av etasjeskillet.
`test/shopfront-floors.test.js` kontrollerer siktlinjer fra begge sider og gulv/underside.
GPU-sjekken `check-shopfront-floors.mjs` farger nederste gulv midlertidig magenta og sjekker
at det skjules ved butikkvinduene med både Full og Reduced Effects. Ved å skjule endeflatene
under kontrollen gjenskapes den opprinnelige feilen. Skjermbilde: `mall-shop-floor-fixed.png`.

`world/floor-reflection.js` lager én plan refleksjon for Mall. `PostFX.render` kjører den
før hovedbildet. Kameraets etasje velger speilplanet; bare gulv i den høyden bruker bildet.
Andre etasjer beholder armaturglans. Full Effects i gåmodus bruker halv oppløsning, begrenset
til 1024 px per akse. Reduced og oversiktsmodus slår av ekstragjengivelsen. Gulv og vann
skjules samlet under speilpasset, slik at refleksjoner ikke blir rekursive. HDR-prøvene
renses for ugyldige verdier før de når bloom; dette er nødvendig på den testede NVIDIA-GPU-en.
Materialdefinisjonene er flyttet fra `build.js` til `world-materials.js` for å holde filene små.

`object-catalog-mall.js` har fire CC BY-modeller med kreditering fra originalfilene:

| ID | Kilde | Mål i meter (bredde × høyde × dybde) | Bruk |
| --- | --- | --- | --- |
| mallbench | mall_bench | 2,161 × 0,834 × 0,665 | Mall |
| pottedpalm | potted_palm_tree | 2,428 × 2,602 × 2,369 | Mall, Poolrooms |
| pottedplant | potted_plant_02 | 1,233 × 0,872 × 1,293 | Mall, kontor, hotell, sykehus |
| pottedtree | potted_tree_01 | 1,270 × 2,693 × 1,293 | Mall |

Modellene er under 1 MB og 22 000 trekanter hver. `potted_plant_01` har Sketchfab Standard
og holdes utenfor med `model.json.disabled`, som de tidligere utsatte modellene.
`gen/mall-traffic.js` holder automatisk møblering unna åpne butikkfronter og rulletrappenes
tilførselsareal. Store blader inngår i kollisjonsboksen, så tettheten er sparsom.

Kontroll: `npm test`, `npm run test:browser -- --hardware` og eventuelt
`node scripts/preview-models.mjs --mall`. Nettlesersjekken kontrollerer modellgeometri i fire
retninger, kreditering, glass, speiling på begge etasjer og synlige piksler med bloom aktiv.
Forhåndsbilder: `node_modules/.cache/mall-hall.png`, `mall-storefronts.png`, `mall-models.png`.
Speiling øker tegnekall; redusert oppløsning reduserer pikselkostnaden, ikke geometrikostnaden.
