# Endringslogg

Alle merkbare endringer i prosjektet føres her.
Formatet følger [Keep a Changelog](https://keepachangelog.com/no/1.1.0/), og prosjektet
bruker [semantisk versjonering](https://semver.org/lang/no/).

## [Ukommet]

### Endret
- Raskere 3D i store og møblerte rom, uten synlig forskjell (målt på GPU, frø 7):
  - Fjerne ballgrupper i ballbingene tegnes som impostorer: en firkant mot kameraet med en rund,
    belyst kule i fragmentshaderen, 2 i stedet for 80 trekanter per ball (`world/ball-shaders.js`).
    Playroom i gåmodus: 1,19 mill. → 0,41 mill. trekanter.
  - Faste gjenstander med samme materiale slås sammen per 16 × 16 m (`world/object-batches.js`),
    også kontaktskyggene; `items` beholdes med delte, skjulte deler. Gulvspeilingen i Mall tegner
    ikke kontaktskygger eller møbler lenger unna enn 12 m.
  - Færre deler per modell (`world/object-parts.js`): deler med likt materiale slås sammen,
    teksturer med ellers likt utseende samles i et atlas per modell (`world/object-atlas.js`,
    med utstrakte kanter mot mipmap-blødning) og rene fargedeler på en palett-tekstur. HiFi-
    anlegget går fra 42 til 2 tegnekall, kiosken fra 24 til 8. Gjenstander med skjermstøy og
    arkadekassene holdes utenfor. Mall i gåmodus: 1420 → 646 tegnekall.
  - Tunge modeller er forenklet i modellrørledningen (`simplify`): kafésett 41k → 8k trekanter,
    kassaapparat 32k → 5k, kontorstol, kaféstol, PC, flamingo, takvifte og laptop. Mall i gåmodus:
    3,6 → 1,8 mill. trekanter; Office 199k → 119k.
  - Lysbakingen av gjenstander (`objectSample`) regner siktlinjer én gang per 5 cm-punkt og deler
    dem mellom alle normalene der og begge sidene av tosidige flater (i snitt 7 prøver per punkt i
    Mall), og 5 cm-punkter med normal på 0,25-gitteret får tallnøkkel i lysbufferen. Bufferne
    frigjøres når gjenstandene er bakt. Siktlinjene starter 2 cm mot hvert lys, så flater på
    halvvegger ikke skygger for seg selv; toppen av halvveggene i Level 0 får nå lys ovenfra.
    Mall (A/B under like forhold, bufrede modeller): 3,0 → 1,2 s.
  - Musikken er kodet om til VBR ~120 kbps: 35 → 16 MB.
- Siktlinjene (`cellHeights`, `lineOfSight`) er flyttet fra `world/lighting.js` til
  `world/sightline.js` (eksporteres fortsatt også fra lighting.js).

### Fikset
- Søyler i Poolrooms-vann fikk en firkantet sjakt rundt seg under vannet: nabovannet regnet
  søyleruten som et gulv nede på bunnen og bygde kantvegger fra bunnen til vannflaten, synlige som
  løse flislagte plater rundt tynne søyler (`surfaceHeight` bruker nå `waterCell`).
- Brede søyler i vann går ned til den dypeste bunnen under fotavtrykket (`pillarBottom`), også i
  fysikken, i stedet for å sveve over dypere trinn ved siden av søyleruten (f.eks. stupegropen).

## [0.2.0] – 2026-10-24

### Lagt til
- «Floor finish» (T) lar brukeren male Theme default, Tiles, Department store,
  Electronics, Arcade og Café manuelt med pensel, rektangel eller fyll. Arkadeteppet
  og butikkbeleggene får tilhørende vegg- og takflater i alle temaer, uten krav om
  generert butikk eller glassfront. Gjenstander plasseres separat.
  Beleggene har egne farger i skissen og riktige fottrinn. Eksisterende butikkfasader
  og automatisk avledede interiører beholdes ved lokal overmaling. Lagres i det
  eksisterende finish-laget (verdier 2–5), med støtte for deling, kopiering og angre.
- Level 0 får noen brede åpninger med 1,1 meter høye, tynne skillevegger,
  gult tapet, gulvlist og brun topplist. Hele endepilarer og en 30 cm overligger
  rammer inn åpningene. Eget genereringsfrø, begrenset tetthet og to meter åpent
  gulv på begge sider bevarer rommenes gangforbindelser. Bare nye genereringer
  endres; eksisterende rom beholdes.
- «Half wall» finnes også i objektvelgeren og følger temaets veggtekstur.
  Partisjonene lagres som vanlige objekter uten nytt romformat. Samme fotavtrykk
  brukes i gange, navigasjon, startpunkt og fysikk; siktlinjer og bakt lys passerer
  over topplisten, men stoppes av selve veggen. Hjørneforming beskytter endepilarene.
  Tester dekker begge sider, rotasjon, opphøyet underlag, lagring/deling, angre,
  lys, kollisjon og sammenhengende genererte rom; nettlesersjekken tegner begge sider.
- Skjult Basement-utsikt: håndbygde vinduer viser en egen, tett betongby fra
  ca. 52 meter over gatenivå, inspirert av Babbdis stemning. Ulike blokkhøyder,
  inntrukne tak, tekniske takoppbygg, enkelte gangbroer, mørke vinduer og grågrønn
  dis. Egen prosedyrell arkitektur og materialer; ingen lånte spillressurser.
  Perspektiv, parallakse og tid på døgnet følger vinduene. Standardeksemplet og
  genererte Basement-rom får fortsatt ingen automatiske vinduer. Utsikten krever
  ingen ny scene, rendertekstur eller endring i romformatet.
- Den nye CC BY-modellen Office Table fra Konstantin Koretskyi er optimalisert
  til ca. 66 kB og lagt i møbelvelgeren, Mall-utstillinger og kontor-/skoleoppsett.
  PC-utstillinger bruker nå dype bord i stedet for grunne TV-benker. Alle fem PC-er
  krever at hele fotavtrykket får plass på støtteflaten; grunne pulter erstattes
  med bord ved generering når det er plass. TV-oppsett beholder TV-benken.
- Poolrooms har runde søyler med jevn belysning og sammenhengende flislegging.
  Søyleverktøyet får diameter 0,5/1/2/3 m; romslige bassenghaller får også større,
  mer glissent plasserte søyler automatisk. Gange, løse gjenstander, veifinning,
  startpunkt og møbelplassering følger faktisk fotavtrykk. Diameteren lagres i
  eksisterende søylemetadata og følger deling, eksport, størrelsesendring og angre.
- Egen telefonspiller: romvelger, eksempler, delte rom og lokalt lagrede rom åpnes
  direkte i gåmodus med ett trykk. Telefoner oppretter ingen editor eller automatisk
  utkastlagring. Skjermknapper for fire bevegelsesretninger, løping, hopping, dørbruk
  og pause; høyre side sveipes for å se rundt. Flerberøring, pointer capture,
  avbrutte trykk og inputnullstilling ved pause hindrer fastlåst bevegelse. Touch
  ber ikke lenger om pointer lock. Større nettbrett og musevinduer beholder editoren.
  Stående/liggende visning, valg av stemning og grafikkinnstillinger, pause ved
  bakgrunnsfane, delte rom/dørbruk og bevaring av utkast testes i nettleseren.
- Den svarte figuren er erstattet med «Ghost from Room 226» av fatalityferi (CC BY
  4.0). Originalen beholdes; spillfilen har 16 interpolerte stoffposer og en sømløs
  tosekunders klipp, forenklet geometri og Meshopt-komprimering (ca. 746 kB mot
  100,8 MB kildebuffer). Opprinnelig stoffbevegelse kombineres med rolig sveving,
  svak vugging og vending mot spilleren. Normalisering måles på de faktiske
  animerte vertexene, så ubrukt basepose ikke gjør spøkelset for lite. Selvlysende
  stoff med foldskygger vises i mørket og følger tåke/dybde. Lastes bare i stemninger
  som bruker monsteret; eksisterende AI, fangstregler og pause beholdes. About har
  lenket kreditering, og tester dekker lasting, animasjon, sveving, pause og dispose.
- To nye Mall-oppsett: Cross Court med et sammenhengende, syv meter bredt tverrtorg
  mellom returarkadene, og Terraces med vekselvis to meter inntrukne butikkfronter.
  Ett Mall-eksempel velger mellom alle tre med nytt frø ved åpning. Tilfeldige
  store Mall-rom velger deterministisk mellom tre oppsett etter frø; små rom
  beholder gallerioppsettet. Tidligere variantlenker åpner fortsatt samme faste rom.
  En tre meter bred ferdselsstripe gjennom gjennomgående tverrtorg holdes møbelfri.
  Geometri, butikkmaterialer, dekker, fontener og rulletrapper bruker eksisterende romlag.
- Formtilpassede kontaktskygger for brede sokler, runde potter og møbelbein. Et delt
  64 × 192-atlas erstatter den store ellipsen; skyggene klippes til samme gulvhøyde,
  utenfor vegger/vann og til bord-/benkflater. Vegg-/takmonterte gjenstander utelates.
  Bevegelige gjenstander beholder skygger som følger fysikken. Ingen ekstra renderpass.
- Stedbundet fontenesus, motorlyd fra rulletrapper og korte originale arkadetoner.
  Avstand i tre dimensjoner, hoderetning, vegger, dører og dekker styrer styrke,
  panorering og lavpassfiltrering. Stillhetsperioder og strømbrudd demper også disse
  kildene. Maksimalt tre avspillingsstemmer, seks sikttester fire ganger i sekundet;
  kildene gjenbrukes og stoppes ved temabytte. Mute/pause bruker eksisterende lydmotor.
  Nye enhets-, GPU- og OfflineAudioContext-kontroller dekker oppsett, skyggeflater,
  panelbaksider, lydretning, hindringer, stille perioder, avstand, strøm og mute/pause.
- Butikkinteriør følger Malls fire lagrede fasadeprofiler: arkade med mørkt romteppe,
  egne planeter/stjernemotiver, mørke veggpaneler og blå/lilla bånd; elektronikk med
  kjølige tekniske fliser og sporpaneler; varebutikk med store kremfliser og trepanel;
  kafé med varme rutefliser og burgunderrød flisbrystning. Separate gulv-, vegg- og
  himlingsmaterialer brukes i begge etasjer. Materialene velges via en avgrenset
  flomfylling fra butikkfrontene, uten nye romlag eller formatendring, også i gamle rom.
  Gallerier, terskler og returarkader beholder Mall-materialene. Ingen overlagte gulv;
  gulvspeilingen skjuler også de nye gulvgruppene. Fottrinn følger teppe/fliser.
- Ni importerte retroobjekter: hi-fi-anlegg, Walkman, fire separate PC-er, VHS-spiller,
  fylt VHS-reol og minikjøleskap. Alle har CC BY 4.0-kreditering og optimaliserte GLB-er.
  Elektronikkbutikkene får hi-fi, PC-/TV-utstillinger og båndspillere på disker; VHS-
  reoler brukes også i varebutikker. PC-ene varierer pultoppsettene i kontorer og skoler,
  små båndspillere brukes sparsomt på andre pulter, og minikjøleskap i kaféer, kontor,
  hotell og kjeller. VHS-kilden som ble erstattet var NC-SA; bare den nye CC BY-modellen
  brukes. PC-pakken deles med grupper av nodeprefikser, med tastatur/mus beholdt.
  Originale skjermbilder, album-/kassettkunst og merker er erstattet med egne motiver.
- VHS-reolen har 210 fysiske coverbokser på fem nivåer og begge sider, med tolv
  originale fiktive filmtitler og geometriske cover: blant andre MIDNIGHT WING,
  SECOND FLOOR, LAST ATRIUM og DEAD CHANNEL. `scripts/vhs-art.mjs` bygger geometri
  og delt atlas ved modellbygging. Hi-fi/VHS-spilleren forenkles til ca. 20 600/16 000
  trekanter; alle nye modeller holdes under 600 kB hver. Tester kontrollerer katalog,
  lisensmetadata, fotavtrykk/støtte, romfil/deling, butikkavgrensning og materialer;
  nettleseren laster modellene i fire retninger og kontrollerer butikkmaterialer i GPU.
- Soft-klossene har avrundede polstrede kanter, formtilpasset vinyltekstur med fine
  korn, innfelte sømmer, trådsting og en liten vaskelapp. De åtte eksisterende fargene
  deler ett deterministisk teksturatlas per form, med sømmer målt i meter. Myk,
  synsvinkelavhengig glans følger rommets bakte lys, strøm og fargetone, også når
  klossene flyttes/velter. Normaler beholdes gjennom lysbakingen. Hver kloss er
  fortsatt én renderdel; avrundede bokser har 216 delte vertexer / 300 trekanter.
- Tre nye soft-former: rampe, rund sylinderpute og lav totrinnskloss. De finnes i
  objektvelgeren og genererte lekerom. Fysikken bruker skrå konveks rampe, sylinder
  og sammensatte trinn i stedet for omsluttende bokser. Alle kan dyttes og beholder
  samme fargevarianter og romformat som klossene. Tester dekker formmål, normaler,
  fysikk etter hvile, profil/rotasjon, automatisk møblering og lagring/deling.
- Malls fontener har tykkere sammenhengende vannkjerner under de animerte dråpene,
  med kraftigere midtstråle, åtte vannbuer, strømmende høylys og større dråper.
  Samme sikre baner og pauserbare tid beholdes. Alle kjernene samles i én mesh / ett
  ekstra renderkall for hele rommet; geometri/materialer frigjøres ved ombygging.
  GPU-sjekken kontrollerer synlig økt strålestyrke, animasjon og pause, samt soft-
  klossenes materiale, delte teksturer og geometri i Full/Reduced.
- To importerte butikkreoler: bred kosmetikkreol og smal apotekreol, tilgjengelige i
  objektvelgeren og automatisk langs bakveggen i Malls hyllereolbutikker. Mål og retning
  følger faktisk GLB-geometri; fotavtrykket holdes inne i butikken og uten overlapp.
  Kildenes CC BY 4.0-kreditering beholdes med endringsmerknad. Originale plakater,
  produktpakninger og skilt erstatter kildefotoer og varemerker; apotekets logogeometri
  fjernes ved bygging. Begge optimaliseres med Meshopt og 512 px WebP-teksturer;
  gjentatte hylledeler bakes til eksplisitt geometri som objektlasteren støtter.
  Plastpalmen fjernes fra katalog, objektvelger, automatisk møblering og modellpakken;
  `model.json.disabled` markerer modellen som utelatt, også for `npm run models -- --all`.
  Pottepalmen beholdes i Poolrooms og Mall. Tester dekker plassering, små/stengte butikker,
  lagring/deling og fjerningen. GPU-sjekken inkluderer begge nye modeller i fire retninger.
- Mall får et møneformet glasstak over atriet, med skrå glassfelt, mørke sprosser og
  rosa lyslister langs kantene. Det flate taket fjernes bare over åpningen; glassgavler
  tetter endene. Himmelfarge og bakt dagslys følger rommets tid på døgnet. Taklys som
  ellers ville svevd under glasset utelates; lys under broer og gallerier beholdes.
  Taket leses fra faktisk romgeometri, så eldre Mall-rom også får glasstak der det passer.
- Fontenesprut midt i Malls dekorbassenger: høy midtstråle, åtte lavere vannbuer og
  animerte ringer ved nedslaget. Én dysegruppe velges per sammenhengende vannflate,
  også i ujevne bassenger; sentrum og nedslag holdes i vannet innenfor steinkanten,
  og høyden begrenses av tak/dekke. Små vannflekker utelates. GPU-partikler deler rommets
  simuleringstid, lys og strømstyrke; pause fryser sprut/ringer uten ekstra fysikk.
- Større genererte Mall-rom har brede tverrplasser og sidearkader bak butikkene, med
  90-graders svinger og sammenhengende rundløyper i begge etasjer. Galleriene, atriet,
  fontenene og rulletrappenes klare tilførselsareal beholdes. Retur- og endegangene
  holdes fri for automatisk møblering, og butikkarealet tilpasses den nye planløsningen.
  Små Mall-rom beholder enklere plan. Alle former lagres i de eksisterende rutelagene.
  Tester kontrollerer skrå takflater uten dobbelt himling, lagring, dagslys, fontene-
  baner/nedslag og faktiske gåturer rundt begge etasjene. Produksjonssjekken tester
  lys/mørke, synlig/animerte vannsprut, pause og GPU-piksler. Ingen nye renderpass.
- Ti egne arkadedesign med ulike spillmotiver, farger, sidekunst, toppskilt, skjermbilder
  og kontrollpaneler: STAR LANES, NEON RALLY, DEEP SIGNAL, CIRCUIT RUN, LUNAR HAUL,
  PRISM DROP, MOSS RELAY, IRON COMET, SUNSET SERVE og NOVA BUMPER. Eksisterende og nye
  maskiner velger stabilt etter plasseringen; naborader får variasjon, og eksplisitt
  objektvariant `v` bevares gjennom lagring/deling. Samme GLB-geometri brukes for alle;
  tjue komprimerte WebP-teksturer lastes ved behov og deles mellom like varianter.
  `node scripts/arcade-art.mjs` bygger UV-tilpasset grafikk fra egne geometriske motiver
  og pikselskrift. Kilde-/lisensfilene og modellgeometrien er beholdt.
  Arkadene senkes nå 30,5 cm (tidligere 12 cm), slik at delen under kabinettet skjules.
  Kataloghøyden er rettet til hele modellens utstrekning, så synlig topp og kollisjon
  stemmer med geometrien. Tester dekker variantfordeling, rotasjon, romfil/deling,
  teksturbudsjett og hevede gulv. GPU-sjekken laster alle ti fra produksjonsbygget,
  kontrollerer materialdeling, UV-retning og kabinettets bunn/topp og tar forhåndsbilde.
- Mall har blanke 30 cm kremfliser med støvrosa innslag og teal romber, glassvern på
  galleriene og svak rosa fargegradering. Full Effects speiler faktiske rulletrapper,
  møbler og butikkfronter i gulvet med ett renderpass i halv oppløsning for etasjen
  kameraet er i; Reduced beholder armaturglans. Passet skjuler gulv og vann for å
  unngå rekursjon, følger bildestørrelsen og frigjør GPU-ressurser ved ombygging.
  HDR-prøver avgrenses og ugyldige fargeverdier stoppes før bloom (hindrer svart bilde på NVIDIA).
- Genererte Mall-butikker har glassfelt, metallrammer, åpne innganger på to meter,
  rosa fasciabånd og åtte fiktive skiltidentiteter i to etasjer. Fire butikkprofiler
  gir hyllereoler, elektronikk, arkade eller kafébord; stengte butikker beholder dørblad.
  Glass forblir vegg for kollisjon og vises blågrønt i 2D. Eksisterende meta-biter
  lagrer fasaden og identiteten i v3-formatet; kopiering/deling/angre trenger ingen nye lag.
  Enkeltfelt etter redigering bygges fortsatt; hjørnevariasjon beskytter butikkfrontene.
- Mall-benk, pottepalme, potteplante og pottetre er optimalisert og lagt i objektvelgeren,
  med mål kontrollert mot synlig geometri i fire rotasjoner og lenket CC BY-kreditering.
  Mall får sitteplasser og grønt, Poolrooms får også pottepalmer, og kontor/hotell/sykehus
  får sparsomme potteplanter. Innganger og rulletrappenes tilførselsareal holdes fri.
  `potted_plant_01` har Sketchfab Standard-lisens og holdes utenfor katalog/bygg med
  `model.json.disabled`, i tråd med prosjektets valg av CC0/CC BY.
  VHS-overlegg og fotostempel har PLAY ▶ og SP i tillegg til dato/klokke.
  Tester dekker fasader, kollisjon, serialisering, temabruk, modellbudsjett og plassering;
  GPU-sjekken verifiserer faktiske piksler med bloom/speiling i begge etasjer og Reduced.
- Tolv nye, komprimerte interiørmodeller: lenestol, kaffekopp, skrivebordslampe, moderne
  kontorpult, klasseromsskap, mobil/veggmontert tavle, sykehusseng, ventestoler,
  skjermbrett, medisinskap og tralle. Tilgjengelige i objektvelgerens grupper og sparsommelig
  møblert inn i kontor, skole, sykehus, hotell, kjeller og kjøpesenter der de passer.
  Pasientoppsett samler seng med valgfritt skjermbrett/tralle; kopper og lamper står på pulter.
  Kildene (104,5 MB) er redusert til 2,71 MB med WebP, Meshopt og geometriforenkling,
  under 22 000 trekanter per modell. Credits viser tittel, skaper, kilde, CC BY 4.0 og endringer.
  Skolepulten (CC BY-SA) og bokhyllen (Sketchfab Standard) er utsatt etter brukerens ønske;
  `model.json.disabled` holder dem utenfor bygg også med `--all`. Modellbyggeren støtter
  valg av mappenavn. Se `docs/models.md` for oversikt og kontroll av dimensjoner/retning.
  Vegg-/takobjekter beholder monteringshøyden over møbler; genererte hjørner respekterer hele
  fotavtrykket til brede, tynne veggtavler. Produksjonssjekken laster alle modellene i fire
  retninger, sammenligner synlig geometri med kollisjonsboksene og sjekker krediteringslenkene.
  Tosidige modelldeler får eget bakt lys/blinkekanaler for bakflaten, valgt med
  `gl_FrontFacing`, slik at sengetøy og skjermbrett ikke får mørke trekantfelt. Ensidige
  deler beholder samme lysdata som før; GPU-sjekken sammenligner lyst sengetøy med en
  referanse uten lys for å fange svarte felt.
- Eget Escalator-verktøy under Heights (E): tegn rulletrapper manuelt fra nedre til
  øvre repos, velg motorretning Up/Down og bredde via Brush size. Bruker eksisterende
  trappe-/rulletrappgeometri og høyder; grønne forhåndspiler/status viser retningen.
  Høyre-drag fjerner, angre/gjør om og lagring/deling bevarer løpet. Vanlig Stairs
  og automatisk Mall-generering beholdes. Ingen nye shaders eller romformatendring.
  Rene tester og produksjonssjekk med ekte verktøyknapper/pekerdrag; se `docs/escalators.md`.
- Plask når fysikkgjenstander som plaststoler dyttes eller faller i vann: lyd og doble
  ringer ved treffpunktet, med styrke etter masse/fart og lyddemping etter avstand.
  Kontakt følger stolens deler og rotasjon; nedsenking og kontakt med bassengbunnen
  gjentar ikke plasket. Virker ved 0 % bakgrunnsbølger og beholder ringer med lyden av.
  Pause/reset støttes uten endring av romdata. Ballbinger gir ikke vannplask.
  Se `docs/object-splashes.md` for implementasjon, fysikktester og nettlesersjekk.
- Utsikt med egen horisont i Office, Mall, Garage, School, Ward, Hotel og Basement:
  byhorisont, tom parkering, skolegård, grønne gårdsrom eller rolig bebyggelse etter tema.
  Egen geometri, avstand, grunnfarge og bakkemønster per profil, med svakt opplyste
  fasadevinduer om natten der det passer. Playrooms uttrykk beholdes; Level 0 får ikke
  et påtvunget uteområde. Første Poolrooms-forslag: en lys, disig bassenggård med brede
  kanter, lav hvit arkitektur og en svak horisont. Ni analytiske boksoppslag per glasspiksel,
  uten nye renderpass. Eksisterende vinduer bruker utsikten direkte; romformat og plassering
  er uendret. GPU-kontroll verifiserer avstand og parallakse for alle profiler; se `docs/windows.md`.
- Liminal utsikt i Playrooms vinduer: tomt gressområde, betongstriper og lave bygg med
  avstandsdis, fra omtrent 40 m utenfor veggen. Analytisk 3D-perspektiv/parallakse følger
  kameraet og er sammenhengende mellom nabovinduer. Følger tiden på døgnet uten ekstra
  scene, eksteriørmodeller eller renderpass. GPU-kontroll måler treffavstand og bekrefter
  kameraforflytning. Se `docs/windows.md` for implementasjon og avgrensninger.
- Løse lekeballer i Playroom: tilfeldig plassert på gulv og på toppen av ballbingene, opptil
  48 automatisk per rom. Ekte kulefysikk gir rulling, sprett og kollisjon med spilleren,
  vegger, møbler og andre baller. De kan sparkes ut av bingene. Play ball kan også settes
  inn manuelt fra objektvelgeren; farge/plassering følger lagring, deling og angre.
  Resten av bingen beholder effektiv instansiert geometri, men får kontinuerlige hauger
  og mindre synlige rader. Pause/reset bevarer romdata. Statisk veggfysikk samles i færre
  bokser med uendret volum, og møbleringen reserverer plass til ballene innenfor objektgrensen.
  Se `docs/play-balls.md` for hybridens avgrensning, kontroller og CPU-måling.
- Rulletrapper i nye Mall-rom og eksempelet: vest opp, øst ned, med bevegelige metalltrinn,
  gule trinnkanter, lyse sidepaneler og avrundede svarte håndløpere. Stillestående spillere
  fraktes mellom atriet og galleriet uten fottrinn; pause fryser bevegelsen. Grønne 2D-piler
  viser kjøreretningen. Flagg lagres i eksisterende metadata; gamle trapper beholdes.
  Mall får også større grålilla steinfliser, rosa perforert himling og varmere lys, inspirert
  av eldre kjøpesentre. Se `docs/escalators.md` for implementasjon og renderkontroll.
- «Water waves»-slider i View → Settings (0–200 %). 0 gir stille bakgrunn, 100 % beholder
  temaets styrke, og høyere verdier gir kraftigere bakgrunnsbølger. Plaskringer er uavhengige. Endringen brukes
  direkte uten å bygge rommet på nytt og huskes på enheten, også ved bytte av rom og vannkvalitet.
- Mer særpreg i Mall, Playroom og School: messing-/tealinnlegg og glans i kjøpesentergulvet,
  polstrede veggbånd og falmede veggmalerier i lekerommet, samt grønne brystninger, slitt
  linoleum og skap med dybde og nummer på skolen. Sparsomme temaskilt deler én mesh og ett
  teksturatlas per rom, og plasseres aldri på vinduer eller formede hjørner.
- Repeterbar CPU-måling (`node scripts/measure-world.mjs`) og renderkontroll med skjermbilder
  (`node scripts/check-scenes.mjs`). Se `docs/performance.md` for målinger og avgrensninger.
- Offentlig «What's new» på About-siden, lenket fra forsiden og simulatorens About-dialog.
  Viser bare store nyheter, med upubliserte høydepunkter under «Coming next». CLAUDE.md
  beskriver skillet mellom den offentlige oversikten og den detaljerte interne endringsloggen.
- Suggestions-knapp på forsiden, About og i simulatoren (og under Help). Dialog for forslag,
  feil og kommentarer sender til hello@liminalsimulator.com, med valgfri svaradresse. Adressen
  er også synlig på siden. PHP-endepunktet har honeypot, servervalidering og sendebegrensning
  per IP og totalt. Ingen romdata sendes med. PHP- og nettlesertester sender ingen ekte e-post.
- New room åpnes ved vanlig oppstart av simulatoren. «Continue current room» beholder rommet
  fra forrige økt; delte rom og eksempellenker åpnes direkte uten oppstartsdialog.
- Innstillinger (View → Settings …): format i fullskjerm (skjermens, 16:9, 21:9 eller 16:10 – et
  smalere format tegnes midt på skjermen med svarte felt, så brede skjermer som 32:9 slipper å regne ut
  dobbelt så mange piksler), oppløsning (100/75/50 %), vann (enkelt/normalt/detaljert), effekter
  (full eller redusert: uten glød og kantutjevning) og bildefrekvens (ubegrenset/60/30). I tillegg
  musfølsomhet, synsfelt og volum, som før ikke kunne endres. Alt brukes med en gang og lagres
  (`ui/settings-dialog.js`, `view3d/display.js`).
- Skrå og avrundede hjørner: det nye verktøyet Corner (Q) skjærer et hjørne på skrå (45°) eller
  runder det av – både innvendige hjørner i et rom (gulvruten får en veggkile) og utvendige hjørner der
  en vegg stikker ut (veggruten åpnes). Velg Angled eller Rounded, klikk nær hjørnet; høyreklikk
  fjerner. Genererte rom får dem også (ikke eksemplene): litt skrått i Level 0, på kontoret og i
  garasjen, avrundet i Poolrooms, lekerommet og kjøpesenteret. Nytt lag `corners` (lagres og deles);
  geometri, kollisjon, lys, veggtopper og 2D-skissen følger formen (`core/corners.js`,
  `world/corners.js`, `gen/corners.js`, `editor/render-corners.js`).
- Mer levende vann: ringer i vannet der du vasser eller svømmer (oftere og større når du går), og
  store, doble ringer når du plasker uti fra stupebrettet, en kant eller en sklie. Ringene speiler
  lyset og forvrenger bunnen som i ekte vann (`world/ripples.js`, alltid på – det koster lite).
- Ny kaustikk på bassengbunnen: et levende nett av lys (kantene mellom bevegelige celler, to lag).
- «Toggle detailed water» (View-menyen, av som standard): speiling og lysbrytning i full oppløsning
  (ellers halv) og flere små bølger som glitrer. Tyngre for svake maskiner.
- Høyere tak og platåer: takhøyden kan nå være opptil 20 m (før 8 m), hevede gulv (platåer) opptil
  10 m (før 4 m) og dekker opptil 10 m (før 5,5 m) – høye sklietårn og store haller. I rom over
  8 m henger lampene i en ledning 8 m over gulvet (eller platået) under, så gulvet er like godt
  opplyst; lavere rom ser ut som før (`HANG` i `world/lighting.js`).
- Ny objektvelger for objektverktøyet: søkefelt, gjenstandene i grupper (Furniture, Electronics,
  Pool & water, Play, Shop & food) med ikon, og en linje om den valgte gjenstanden – størrelse og hva
  den kan (flyter, henger i taket, kan gå ut på …). Erstatter de 39 tekstknappene
  (`ui/object-picker.js`, `ui/object-info.js`; en test passer på at nye modeller får gruppe og ikon).
- Stupebrett («Diving Board» av danielisthebosss, CC BY 4.0, kreditert på About-siden). I Poolrooms
  får omtrent halvparten av de store bassengene et brett – noen ganger to – med foten på kanten og
  brettet ut over vannet, og dypt vann (2,8 m) der man lander (ikke i eksemplene, som har faste
  dybder). Man kan gå ut på brettet og hoppe: mellomrom hopper (høyere fra brettet), og går man
  utfor tuppen, faller man i vannet med et plask (`gen/diving.js`, `core/object-walk.js`).
- Hopp og fall i gåmodus: mellomrom hopper overalt (ikke fra bunnen av bassenget), og går man utfor
  en kant (over 0,5 m), faller man med tyngdekraft i stedet for å gli ned.
- Pause i gåmodus: Esc slipper musa og legger menyen midt på skjermen (dempet bakgrunn, store
  knapper og «▶ Resume» øverst), så Drift, Photo, VHS, Mood, Sound, Music og Exit alltid kan nås.
  Et klikk eller Resume fortsetter i fullskjerm; Esc én gang til går tilbake til editoren. I
  Chrome/Edge holder Keyboard Lock fullskjermen ved et kort trykk på Esc (hold for å gå ut); i
  Firefox/Safari forsvinner fullskjermen, men man blir stående på pause i panelet.
- Monsteret går: bena har kne og lange, tynne føtter som går i takt med farten, kroppen vugger litt
  i skrittet, og står det stille, flytter det vekten fra fot til fot (`view3d/monster.js`).
- Lysfarger: rommet kan få en egen lysfarge (Atmosphere → Light colour: Warm, Cold blue, Lilac,
  Pink, Sickly green, Teal, Red – eller Shifting, som glir rolig fra farge til farge, 20 s hver og
  14 s overgang). Fargen lagres med rommet og følger med lenken. Velgeren i 3D-vinduet følger
  rommets farge («Room's light») eller overstyrer den. Fargen legges over det bakte lyset i
  shaderne (`uTint`), med samme lysstyrke som temaets lamper, så den kan endres uten ny baking
  (`core/tints.js`). Av og til (1 av 4) får et nytt uendelig nivå en egen lysfarge.
- Musikk: ♪-knappen over 3D-panelet (og «♪ Music» / N i gåmodus) slår musikk av og på. Sangene i
  `music/` (fire stykker, laget med Mureka) spilles etter hverandre i loop fra en tilfeldig sang,
  med myk inn- og uttoning, og følger volumet. Nye sanger legges bare i `music/` – tittelen hentes
  fra filnavnet (`audio/music.js`, `audio/playlist.js`). Kreditert på About-siden.
- Størrelse på de uendelige nivåene: en velger over 3D-panelet (Small / Medium / Large / Huge
  levels) bestemmer hvor store rommene bak dørene til ingensteds blir (0,6–2,2 × dagens størrelse),
  og hvor lange korridornivåene er. Lagres med innstillingene og gjelder fra neste nivå
  (`gen/sizes.js`).
- Lekeplass i lekerommet: et lekestativ med krone, sklier og husker («Playground set» av
  Rasputnik00) og tre hoppeslott fra «Bounce House» av Jeremy E. Grayson – et klassisk hoppeslott,
  et kombislott med klatrevegg og sklie, og en ca. 10 m lang hinderløype. Alle CC BY 4.0 og
  kreditert på About-siden, og møblert inn i lekerommet.
- `npm run models`: `"split"` i `model.json` deler en fil med flere modeller i hver sin .glb.
- To nye modeller: en solseng (fluktstol med stripet stoff, «deck chair» av MaX3Dd) og en
  plastpalme («Palm Tree Fiberglass» av Bensonnix), begge CC BY 4.0 og kreditert på About-siden.
  Solsengene står to og to langs bassengkanten i Poolrooms (i stedet for plaststolene, av og til),
  og palmene står langs veggene i Poolrooms og i atriet i kjøpesenteret.
- `npm run models`: `"simplify"` i `model.json` forenkler tunge modeller (palmen: 145 000 → ca.
  17 000 trekanter, 1 MB → 246 kB).
- Rommet reagerer på deg (Liminal og sterkere): når du ikke ser etter, endrer det seg litt bak
  ryggen din – en dør du gikk gjennom er blitt vegg (aldri den eneste veien tilbake), et lys du
  gikk under har sluknet, en stol har snudd seg mot deg, en dør som stod åpen er lukket. Og av og
  til, når du stopper etter å ha gått en stund, går noen et par skritt til. Oftere jo sterkere
  stemningen er (`shifts` i `gen/moods.js`; logikken i `world/shifts.js`, verdenen bygges på nytt
  fra en kopi i `view3d/shifts.js`). Ikke mens du har dyttet på klosser og stoler, sklir eller er
  i en uendelig gang.
- Frø for genererte rom: samme frø og tema gir alltid samme rom. Sidepanelet har et frøfelt med
  «Generate» (fra frøet) og «🎲 Random» (nytt frø), «New room» → «Randomly generated» har et
  frøfelt, og frøet vises etter generering. Frøet lagres med rommet (fil, lenke, angre). Nye
  tilfeldige frø er 1–99999, så de er lette å skrive av og dele.
- Variasjon i genererte rom (`gen/variety.js`): takhøyden varierer litt fra nivå til nivå
  innenfor temaet, noen bassenghaller i Poolrooms får høyt tak (4,8–6,8 m), og bassengene får ulik
  dybde – grunne plaskebassenger, vanlige, med grunn og dyp ende (bunnen går i trinn) og en sjelden
  gang et dypt et. I Uncanny og Nightmare er flere bassenger mørke og dype. Eksemplene er som før.
- Dører og gjenstander i veien for hverandre (`gen/door-space.js`): dørblad som ville slått inn
  foran en annen åpning snus (eller mister dørbladet), møbleringen holder rutene foran dørene fri,
  og det som likevel står i veien fjernes – med det som stod oppå.
- Plaststolene har fysikk i gåmodus: de dyttes bortover, velter og kan havne i bassenget
  (`loose` i katalogen: masse, tyngdepunkt og en enkel form av bokser). Fysikken har nå ekte
  gulvhøyder (bassengbunn, opphøyde gulv), og skyggen følger med når noe flyttes.
- Blanke fliser: lampene i taket speiler seg i flisgulv og -vegger (Poolrooms og flislagte rom),
  med matte fuger og fliser som ligger litt skjevt, så speilbildet brytes opp flis for flis. Det
  slukner med lampene ved strømbrudd og blinker med dem. Billig: ingen ekstra tegnepass, bare et
  lite kart over armaturene som shaderen slår opp i (`world/gloss.js`, `world/lamp-map.js`).
- Realistisk vann: speiling av rommet (Reflector), lysbrytning av bassengbunnen
  (Refractor), dybdeavhengig farge og absorpsjon, Fresnel og rolige bølger. Egne
  vannparametere per tema.
- «Toggle water reflections» i View-menyen for svakere maskiner (faller tilbake til enkel,
  gjennomsiktig vannflate).
- 3D-oversikten rammer inn rommet automatisk når det første gulvet tegnes.
- Takhøyde per sone: verktøyet «Ceiling» (C) maler egen takhøyde (2,2–8 m) på deler av
  rommet. Overgangen mellom soner får en vegg, og armaturene henger under sonens tak.
- Vanndybde: «Water depth» for hele rommet i Room-panelet, og verktøyet «Depth» (D) for
  egne dybder (0,3–3 m) i deler av bassenget. Bunnen får trinn, vannfargen følger dybden
  og kaustikkene blir svakere i dypt vann.
- Svømming: der vannet er dypere enn ca. 1,4 m flyter man i overflaten og beveger seg
  saktere.
- Skissen viser sonene med farge, stiplede grenser og etiketter (↕ høyde / dybde). Ruten
  under pekeren viser takhøyde og dybde, og nøkkeltallene viser tak- og dybdespenn.
- Nytt tema «The Basement»: rent beige teppe med støvsugerstriper, matt beige maling, hvite
  gulvlister og karmer, varme takplafonder (ny armaturform «dome») og egen generator med
  stue, små rom, bærestolper, boder og en trapp. Nytt eksempel «The Basement».
- Dører: verktøyet «Door» (O) setter et dørblad i en døråpning – lukket, på gløtt eller
  åpent – eller lager en «dør til ingensteds» i en vegg med rom bare på én side. Klikk
  igjen for å snu døren; høyreklikk fjerner bladet. Dørene får karm, foring og håndtak
  etter temaet, boder på gulvnivå kan få egne (lamell)dører, og skissen viser dørblad med
  slagbue.
- Lukkede dører stenger for spilleren og for det bakte lyset.
- Generatorene setter inn dører: kontoret får dører i åpningene, hotellet lukkede dører
  mellom gangene og den uendelige gangen lukkede dører i nisjene.
- Gulvhøyde: verktøyet «Raise» (H) hever gulvet (0–4 m) for plattformer og reposer.
  Taket holdes alltid minst 2,1 m over gulvet.
- Trapper: verktøyet «Stairs» (S) – dra fra bunn til topp. Trappen stiger til et høyere
  gulv i enden, ellers 0,6 m per rute opp i en trappesjakt (trapp til ingensteds). En
  døråpning på toppen får trappens høyde. Penselstørrelsen gir bredden.
- Man går ikke rett opp på kanter høyere enn 0,45 m (bare via trapper), men kommer alltid
  opp av bassenget.
- Rekkverk: åpne sider av trapper og kanter med mer enn 0,45 m fall får håndlist med spiler
  og stolper der rekkverket slutter; trappesider mot vegg får håndlist på veggen. Vernet
  stopper spilleren. Farger per tema (eik og hvite spiler i kjelleren, gult i garasjen).
- Fliser: verktøyet «Tiles» (T) gir gulv og nedre del av veggene (1,4 m) fliser, for bad og
  vaskerom. Skissen viser flisfuger. Kjelleren får et flislagt bad.
- Vannsklier: verktøyet «Slide» (L) – dra fra et hevet gulv (minst 1 m) ned til vannet, med
  så mange svinger du vil. Banen glattes til myke kurver, høyden faller jevnt til litt over
  vannflaten, og hver sklie er en åpen renne eller et lukket rør. Rennen glitrer som en
  vannfilm, krenger i svingene og står på støtteben; taket løftes der den trenger plass,
  og vernet på plattformen får en åpning. Sklier som ikke virker vises røde i skissen med
  forklaring. Høyreklikk fjerner en sklie.
- Skliing: gå inn i toppen av en sklie, så tar den over – farten kommer av helningen,
  kameraet sitter i rennen og krenger i svingene, og du hører vannsus. Nede blir det plask,
  et kort dukk under vannflaten, og du svømmer videre.
- Poolrooms-generatoren lager plattform med trapp og en vannsklie i det største bassenget
  (også i eksempelet «The Poolrooms»). Plattformen er 1,2, 1,8 eller 2,4 m høy, og hele
  bassengrommet får tak 2,5 m over plattformen (minst temaets takhøyde).
- Sklier har farge: blå, rød, grønn eller hvit (velges i verktøyet; tilfeldig i generatoren).
- Dører kan åpnes og lukkes mens man går: stå foran en dør med rom bak og trykk E (teksten
  «E – open the door» vises). Døren svinger opp og slår igjen med et dunk. Selve
  rommet endres ikke – dørene står som i editoren neste gang.
- Skumle lyder i rykk og napp (med lyd på): banking, knirk, fjerne skritt, hvisking,
  elektrisk surr, metallstønn, en telefon langt unna, gurgling og drønn – ulike lyder per
  tema, fra tilfeldige retninger og avstander, av og til flere tett etter hverandre.
- Nytt tema «The Playroom» (lekerom): puslematter i rødt, blått, gult og grønt, hvite vegger
  med fargeblokker, og ballbinger i stedet for bassenger – tusenvis av baller i rødt, grønt,
  gult og blått (én instansiert mesh med bakt lys). Myke trinn på mattene, raslende baller
  når man vasser eller lander fra sklien, og spilledåse blant de skumle lydene. Egen
  generator med lekesaler, ballbinger, dører og en sklie ned i den største bingen. Nytt
  eksempel «The Playroom». Temaer kan fylle bassengene med baller (`pit: 'balls'`,
  `pitColors`), og skissen viser ballbingene som konfetti.
- Dørkarmene har fått en stopperlist som dørbladet lukker seg mot.
- Dekker (andre etasje): verktøyet «Deck» (K) gir gulv- og søyleruter et dekke i 2,4–5,5 m
  høyde, så man kan gå både under og oppå – en mesanin eller et galleri. Ruter uten dekke
  blir et åpent atrium man ser ned i. Platen får gulv oppå, himling under og kantlist mot
  atriet; kanten får vern i dekkets høyde, og trapper kan gå opp til dekket. Et lys i en
  rute med dekke gir én armatur i hver etasje, og platen stenger lyset mellom etasjene.
  Skissen viser dekker med skravur, tykk kant og etiketten «▤ deck». Går man utfor kanten
  der det ikke er vern, faller man ned i etasjen under.
- Nytt tema «The Mall» (kjøpesenter): blanke terrazzofliser, steinpanel nederst på veggene,
  høyt atrium, egne skumle lyder (heismusikk langt borte og en høyttalerklokke) og stor
  romklang. Generatoren lager butikker i to etasjer langs langsidene (noen stengt med dør),
  gallerier rundt atriet med søyler, en bro over atriet, fontener, trapper opp i hver ende
  og nødutganger. Nytt eksempel «The Mall».
- Gjenstander (ferdige 3D-modeller): verktøyet «Object» (J) setter en gjenstand i en
  gulvrute. Den vender ryggen mot en vegg ved siden av og står inntil den; klikk igjen for å
  snu den en kvart omdreining, høyreklikk fjerner den. Modellene får rommets bakte lys og en
  myk kontaktskygge, stopper spilleren og vises i skissen med forsiden markert. Første
  modell: et CRT-TV (Television 02 fra Poly Haven, CC0).
- Flere gjenstander: boombox, laptop, skrivebord (2 m bredt, går over flere ruter) og
  badeand – alle fra Poly Haven (CC0). Små gjenstander settes oppå skrivebordet (klikk en
  rute bordet dekker), og trekkes inn så de står helt på bordplaten. Gjenstander går ikke
  inn i vegger eller i hverandre; finnes det ingen retning der en får plass, settes den ikke
  inn. Viskelæret tar den øverste gjenstanden først.
- Badeender flyter i vannet og har enkel fysikk i gåmodus: de duver, dyttes når man vasser
  eller svømmer inn i dem, glir videre med vannmotstand, snurrer, spretter av bassengkanten
  og av hverandre, og skyves utover når man plasker ned fra en sklie. De er tilbake på
  plass når man går ut av gåmodus.
- Ballbingene får kjølvann: ballene rundt deg dyttes til side og hoper seg opp når du
  vasser (eller lander fra sklien), og glir sakte tilbake. Bunnen av bingene viser mørkere
  baller lenger ned, så glippene ser dype ut.
- Modellrutine: kildemodeller (glTF) legges i `3dmodels/<navn>/`, og `npm run models` lager
  én komprimert `models/<navn>.glb` per modell (WebP-teksturer på maks 1024 px, meshopt-
  geometri) – TV-et gikk fra 1,24 MB til 151 kB. Modellene lastes først når et rom bruker dem.
- Monsteret er skumlere: altfor høyt og tynt, med oppdratte skuldre, armer med albuer som henger
  rett ned til knærne og ender i lange fingre (før stakk de ut som en V), en tynn hals og et avlangt
  hode på skakke. Det puster, armene svaier, hodet rykker brått til siden innimellom, og det lener
  seg fram når det jakter. Smilet er bredere og øynene ulike.
- Stemningsskala for gåmodus: Normal → Abandoned → Liminal → Uncanny → Nightmare (velger over
  3D-visningen, knapp i gålinjen, tasten X; huskes). Én innstilling styrer tåke og lysstyrke,
  andelen ødelagte og blinkende lys, «Make it wrong» (genererte nivåer fra Liminal, ditt eget rom
  fra Uncanny), romlige avvik, korridornivåer, strømbrudd, hvor ofte de skumle lydene kommer og
  monsteret (Uncanny: viser seg, tar deg aldri; Nightmare: jakter). Liminal er standard og
  tilsvarer det som var før. Endringer i ditt eget rom gjøres på en kopi i gåmodus – rommet i
  editoren er urørt når du går ut. Erstatter Scary-knappen (Scary → Nightmare, Scary · mild →
  Uncanny, også for lagrede innstillinger).
- Romlige avvik i gåmodus:
  - Ganger som er lengre innenfra enn utenfra: i en rett gang der vegger, dører, lys og gjenstander
    gjentar seg i et fast mønster, flyttes man sømløst tilbake når man krysser midten – alt ser likt
    ut, men enden kommer aldri nærmere. Etter én eller to runder slipper gangen taket. Flyttingen går opp i
    både mønsteret og teksturene (teppe, tapet), så ingenting hopper. Virker i «The Endless
    Corridor» og i ganger man tegner selv med jevnt fordelte lys.
  - De uendelige nivåene får av og til et korridornivå: en lang gang i hotell-, kontor-, skole-,
    sykehus-, kjeller- eller Level 0-stil med dører og lys i fast takt og utgangen helt i enden.
  - En dør til ingensteds fører av og til (25 %) tilbake inn i det samme rommet, ut av en annen dør –
    uten tittel og uten forklaring.
  - Av og til er neste nivå det samme rommet igjen, med noen små endringer («Make it wrong»,
    subtilt) – og man kommer ut av den samme døren man nettopp gikk inn i.
  - Kassetter legges ikke i uendelige ganger.
- TV-benk («Brunn Design KAALM Lowboard Sand» av Brunn Design, CC BY 4.0, kreditert): TV-en i
  kjellerstua står på en benk, med konsollen ved siden av og sofaen foran; hotellet, sykehuset og
  kjelleren får også TV på benk. En gjenstand som er dypere enn flaten den står på, holder ryggen
  mot veggen og stikker ut foran (før ble den sentrert og havnet i veggen), og flaten den står på
  finnes der gjenstanden står, ikke midt i ruten.
- `model.json` kan ha `textureSize` (f.eks. 512) for modeller med store teksturer.
- Fysikken for lekeklossene lastes mer robust: Vite forhåndsbunter cannon-es, og innlastingen prøves
  på nytt om den feiler (ellers kunne klossene bli stående stille hvis dev-serveren startet før
  biblioteket var installert).
- Plaststol og flamingo-badering fra Sketchfab (CC BY 4.0, kreditert): Poolrooms får plaststoler
  langs bassengkanten med ansiktet mot vannet, én eller to sammen, og flamingoer som flyter og
  dyttes rundt i gåmodus akkurat som endene (flytende gjenstander har nå hver sin størrelse).
  Lekerommet, garasjen og Level 0 får en og annen plaststol.
- Åtte nye modeller fra Sketchfab, alle kreditert med lenker på About-siden (CC BY 4.0):
  arkademaskin, kasseapparat, diner-stol, diner-bordsett, kontorstol, treskrivebord, retro-PC og
  brusautomat. (En kopi av en kjent arkademaskin med varemerket navn og en reol med CC BY-SA ble
  tatt ut igjen.) Bruk:
  - kontoret: skrivebord med kontorstol foran (av og til skjev) og PC, laptop m.m. oppå
  - skolen, kjelleren og hotellet: treskrivebord med stol
  - kjøpesenteret: ny butikktype «spillehall» med arkademaskiner og brusautomat; kasseapparat på
    alle skrankene; dinersett og kafébord i food court; brusautomater i gangene
  - sykehuset og hotellet: ventestoler på rad mot veggen
  - lekerommet: et hjørne med arkademaskiner; Level 0: en ensom arkademaskin eller stol
  - brusautomater i gangene på skolen, sykehuset, kontoret, hotellet, bassengene og garasjen
- `npm run models` forbehandler modellene: gamle spec/gloss-materialer gjøres om til metal/rough,
  fargeteksturer som ligger i emissive-plassen (bakt lys, unlit) flyttes til fargeplassen, og en
  valgfri `model.json` (`drop`) fjerner deler modellen kom med (f.eks. bordplaten under PC-en).
  Bare endrede modeller bygges (`--all` bygger alle).
- Modeller uten normaler (unlit) får dem regnet ut ved lasting.
- Sofa («Old Reliable Couch» av Jace B., Sketchfab, CC BY 4.0 – kreditert med lenker på About-siden):
  kjellerstua får en sofa som vender mot TV-en (med konsoll og kontrollere), og hotellet, kontoret
  og sykehuset en og annen sofa mot veggen. Katalogen har nå `turn` (dreie modellfilen så forsiden
  vender riktig) og `attribution` (kreditering som lisensen krever).
- Nye gjenstander fra Poly Haven (CC0): takvifte (henger under taket og snurrer sakte), veggklokke
  (henger på veggen), spillkonsoll, spillkontrollere og kassettspiller. Kjelleren får TV med konsoll
  og kontrollere på gulvet, takvifter og klokke; hotellet takvifter, klokker og en og annen
  kassettspiller; skolen og sykehuset klokker i rommene; lekerommet TV med konsoll; kontoret og
  Level 0 en klokke her og der. Kassettspiller og konsoll kan også ligge på skrivebord.
- Myke lekeklosser i lekerommet, som på en lekeplass innendørs: kuber, plattformer, søyler, bjelker
  og vegger i skumgummi, trukket med stoff i lyse farger. Genererte lekerom får små byggverk –
  portaler (to søyler med en bjelke over), tårn, plattformer med en kube oppå, trapper. I gåmodus
  har de ekte fysikk (cannon-es, lastes bare når rommet har klosser): de dyttes når man går inn i
  dem, velter, ramler ned og spretter litt, med et dumpt dunk når de lander. Høye klosser stopper
  en, lave kan man gå over. Alt står der det stod når man går ut av gåmodus. Klossene finnes også
  i Object-verktøyet, og en ny kloss på en annen legges oppå (stables).
- Butikker i kjøpesenteret: større (7–11 m brede, dypere), med blågrått teppe og mørk fotlist, og
  ryddig innredning etter butikktypen – rader med tomme, tosidige hyllereoler, tomme veggreoler
  langs bakveggen, TV-er på rad i en elektronikkbutikk, en skranke med kasseapparat ved inngangen,
  eller helt tomt. Kiosker, kafébord og boombox holdes ute i gangene og atriet. Nye gjenstander
  (også i Object-verktøyet): «Shop shelf», «Wall shelf» og «Shop counter».
- Gatekjøkken: en kiosk (3 × 1,5 m) med opplyst skilt med oppdiktet navn (Burger Stop, Pizza
  Plaza, Noodle Bar, Hot Dog Hut, Fries & Co – «Cafeteria» på skolen, «Kiosk» på sykehuset), rød
  eller farget disk med en enkel burgerlogo, og et hvitt, flislagt bakrom med kjøleskap, maskiner
  og menytavle som lyser av seg selv. Og et kafébord med tre stoler i burgunder. Begge bygges av
  enkle former (`world/props.js`), ikke modellfiler, og finnes i Object-verktøyet. Level 0 får
  av og til en kiosk med et bord foran, kjøpesenteret en food court med kiosker og bord i atriet,
  skolen en kantine, sykehuset en kiosk, og kontoret og hotellet et og annet kafébord.
- Store gjenstander står med ryggen inntil veggen også når de er dypere enn én rute.
- Hverdagstemaer: «The School» – lange korridorer med metallskap langs veggene, flekket
  linoleum, malte murblokker, klasserom med kateter og dører som står åpne, vinduer i
  klasserommene og en skoleklokke som ringer et sted langt borte – og «The Ward» – en lang,
  blank sykehusgang med mintgrønne vegger og håndlist, pasientrom med for det meste lukkede
  dører, små flislagte bad, kaldt hvitt lys og en pasientmonitor som piper. Nye eksempler «The
  School» (gyllen time) og «The Ward» (skumring). Felles generator for korridorbygg
  (`gen/building.js`): bånd med rom på begge sider av korridorene, tverrkorridorer i endene.
- «Make it wrong» (Atmosphere i sidepanelet): gjør 5–20 små endringer som hver for seg er
  nesten umerkelige, men som til sammen gjør at noe føles galt – taket litt for høyt eller lavt i
  en del av rommet, et lys som mangler, flimrer eller står litt utenfor mønsteret, en dør på gløtt
  eller lukket, en dør til ingensteds, en TV med skjermen mot veggen, en gjenstand der den ikke
  hører hjemme, en trapp som går opp i taket, en søyle som ikke bærer noe, et flislagt felt midt
  på teppet, et vindu for mye, litt tettere luft og litt svakere lys. Styrke: Subtle (5–8), Wrong
  (9–14) eller Very wrong (15–20). Stedene markeres med ringer i skissen i noen sekunder; Ctrl+Z
  angrer alt på én gang.
- Lyd som følger rommet: romklangen måles der du står (avstand til veggene i 16 retninger og
  takhøyden) og glir mellom en kort og en lang klang – store haller og atrier klinger lenge, smale
  ganger og små rom er nesten tørre, og fottrinn og andre lyder endrer seg når du går fra rom til
  rom. Bakgrunnslyder over tid: ventilasjonen slår seg av og på med et klunk, dempet musikk spiller
  fra et rom et sted (mer dempet med vegger imellom, fra riktig side), regn mot taket (tydeligere og
  lysere ved vinduene), og innimellom kommer lange perioder med nesten total stillhet.
- Drømmegange («Drift» i gålinjen, G, eller 🌙 Drift over 3D-visningen): kameraet glir sakte og
  av seg selv gjennom rommet – lange etapper mot steder det ikke har vært, rundt vegger og utenom
  bassenger, med myke svinger og lite hodebevegelse – og går etter noen etapper gjennom en dør til
  ingensteds videre til neste nivå. Gålinjen tones ned; en gåtast tar over styringen.
- Vinduer og dagslys: verktøyet «Window» (W) setter vinduer i vegger som vender mot et rom (hvit
  karm, glass med sprosser og en himmel så lys at den «brenner ut»). Lyset kommer inn i rommet i
  himmelens farge, og sola kaster lange solflekker med sprosseskygge på gulvet. Tiden på døgnet
  velges under Room («Window light»: Day, Golden hour, Dusk, Night). Kontoret, bassengrommene og
  lekerommet får vinduer i ytterveggen og en tilfeldig tid på døgnet; «The Office at 3 AM» er natt.
- Scary mode («Scary» i gålinjen eller X; huskes): tettere tåke og mørkere bilde, strømbrudd
  oftere og lenger (12–18 s), og de skumle lydene kommer tettere. Et monster – en høy, kullsvart
  skikkelse med lysende øyne og et bredt smil – står i lyset langt borte og forsvinner når du
  nærmer deg. Når lyset går, kommer det etter deg: det finner veien rundt vegger, men ikke
  gjennom lukkede dører, og går raskere enn du går, men saktere enn du løper. Hjertebank og
  pust fra den siden det er. Tar det deg, rives bildet opp i videostøy og du våkner på et nytt
  nivå («YOU NOCLIPPED»). About-siden advarer om flimring og mørke.
- Scary mode uten jumpscares: Scary-knappen (og X) veksler av → Scary → Scary · mild → av. I
  den milde varianten er monsteret der, men det tar deg aldri – det trekker seg unna i mørket når
  det kommer nærmere enn 3 m – og hjertebanken er svakere.
- Genererte rom (eksemplene og de uendelige nivåene) får gjenstander som passer til temaet:
  skrivebord med laptop, TV eller boombox på kontoret, et TV i kjellerstua, badeender i
  bassengene og ballbingene, en rad med TV-er i en butikk i kjøpesenteret – og bare en og
  annen forlatt TV eller boombox i Level 0, hotellet og garasjen. Gjenstandene står mot
  veggen, aldri foran dører eller trapper eller ved startpunktet (`gen/furnish.js`).
- Uendelige nivåer: i gåmodus fører en dør til ingensteds (E – go through the door) videre
  til et nytt, generert nivå med et annet tema – svart overgang og tittelen «LEVEL 1 – The
  Mall» i VHS-skrift. Nivåene finnes bare i gåmodus; går man ut, er man tilbake i rommet fra
  editoren. Genererte rom (også eksemplene) får 2–3 utganger i ytterveggen.
- VHS-kassetter å lete etter i gåmodus: 1–5 per rom, spredt rundt (også oppe på dekker).
  Man plukker dem opp ved å gå bort til dem; gålinjen viser «LEVEL 2 · 📼 3/5».
- Strømbrudd: av og til flimrer alle lysene, går ut i noen sekunder med et dunk og en
  synkende tone, og kommer tilbake. Bare TV-ene lyser i mørket.
- TV-er viser sne-støy som lyser (sakte rullende bånd og linjer), kaster et svakt lys rundt
  seg og suser når man kommer nær.
- Fotomodus: trykk P i gåmodus (eller «📷 Photo» i gålinjen / 📷 over 3D-visningen) for å
  ta et bilde med VHS-filteret, «▶ PLAY», dato, romnavn og et lite vannmerke. Bildet lagres
  som PNG – på mobil kan det deles direkte. Hvitt blink og lukkerlyd.
- Forhåndsvisning av lenker: forsiden, simulatoren og About-siden har tittel, beskrivelse og
  et forhåndsbilde (`public/og-image.jpg`, tatt med fotomodus i kjøpesenteret) for
  Messenger, Discord, Facebook og lignende. Delte rom får det samme generelle bildet.
- About & credits-side (`about/`): hva siden er, hvordan rom lagres (bare i nettleseren),
  kreditering av modeller (fra katalogen), three.js og fonten VT323. Lenket fra forsiden og
  fra Help → About Liminal.
- Publisering med `npm run deploy`: kjører testene, bygger og laster opp `dist/` over SFTP
  (ressurser først, sidene sist). Tilkoblingen ligger i `.env.deploy` utenfor git; `--clean`
  fjerner gamle byggfiler i `assets/` på serveren, `--dry-run` viser hva som lastes opp.
- Prosjektet ligger i git.
- `.htaccess` i bygget sender besøk over http:// videre til https:// (Apache/one.com).
- Forside (`index.html`): presentasjon med en VHS-korridor, kort for hvert eksempel med ekte
  planbilde og «Walk it»-lenke, «How it works» og plass til et reklamebanner (`#ad-slot`,
  skjules når den er tom). Lenken `app/#example=<id>` åpner et eksempel direkte.

### Endret
- Telefonspilleren styres med en flytende analog joystick under venstre tommel (vises der
  tommelen settes ned, med dødsone og gradvis fart) i stedet for fire pilknapper; høyre halvdel
  sveiper blikket med omtrent 2,5 × høyere følsomhet, så en skjermbredde snur nesten en halv runde.
  Run er en av/på-knapp, Run/Jump/Use er større, og bare ett kort hint vises ved start.
- Mer naturlig vindusutsikt: skråtak på lave bygg, inntrukne toppetasjer i Office,
  sparsom avrundet vegetasjon i Playroom/School/Ward/Basement, myke skyer og mer
  variasjon i bakke, fasader og lys. Poolrooms beholder ren, lav arkitektur uten
  trær/vindusruter. Avstand, kameraforflytning og sammenheng mellom glass beholdes.
  Detaljer beregnes bare for nærmeste treff og ubrukte deler kompileres bort per
  tema; mipfiltrert 16 KiB-støykilde erstatter kostbar løpende støy og frigjøres ved
  materialdisponering. Ingen nye renderpass. GPU-kontroll dekker ni temaer ved fire
  tider på døgnet, fire veggretninger og åtte prøver av nye former. Se `docs/windows.md`.
- Roligere lyd ved gange i vann: langsommere anslag, dobbel lavpassfiltrering, færre
  og svakere bobleklikk, lavere nivå og egen lydutgang med mindre romklang. Lydprøve
  `audio-water.wav` og tester ved fire samplingsfrekvenser; plask fra hopp/landing beholdes.
- Mykere fotsteg på alle underlag, særlig teppe og skummatter: avrundet, lengre anslag,
  dempet bassdunk, lavere topp-/avspillingsnivå og egen lydutgang med mindre romklang
  for teppe/skum. Filterfrekvensene følger samplingsfrekvensen, og bufferne fader til
  null ved slutt. Fliser, betong, vann og ballbinger beholder ulike lydkarakterer.
- Gummiklosser får en egen, dempet kompresjonslyd med kort hale i stedet for bygningens
  tunge dunk. Fysikken sender materialtype til lydlaget; styrken følger fallet, og
  tette kontaktmeldinger fra én velting begrenses til ett gummistøt per 120 ms.
  Stoler/baller og bakgrunnsdunk beholder sine lyder. Offline Web Audio-kontroll med
  WAV-prøver og tester ved fire samplingsfrekvenser; se `docs/audio.md`.
- Poolrooms får færre, større automatiske vindusfelt: 3–5 m brede, 45 cm brystning og
  opptil 3 m overkant, begrenset av takhøyden. Like nabovinduer deler én sammenhengende
  glassflate uten stolper; karmer/lysning ligger i flukt med veggen, uten utstikkende
  vindusbrett. Editor, åpninger og brede solflekker følger feltene. Eksisterende flagg,
  håndmalte vinduer og romformat bevares; andre miljøers vindusstil er uendret.
  Se `docs/windows.md` for generering, geometri og kontroller.
- Playrooms sklier har tørr plastoverflate uten vannkaustikk. Vannsklier i Poolrooms
  beholder den animerte vannfilmen; nettleserkontrollen sjekker begge materialvariantene.
- Store statiske flater deles i romlige grupper på 16 × 16 m, slik at grafikkortet slipper
  geometri utenfor hvert kamerabilde, også i vannets speil-/brytningspass. Små flater beholdes
  samlet. Ballene i Playroom deles i instansgrupper på 8 × 8 m; antall, form, farge, lys og
  kjølvann er uendret. Bounds tar høyde for shaderbevegelsen, inaktive kjølvannspunkter
  hoppes over, og instansbuffere frigjøres når rommet byttes. Vertexstatistikken teller nå
  også ballene. Ingen endring av romdata, fysikk eller grafikkinnstillinger.
  Gjennomsnittet av tre faste kameravinkler, frø 6: 56–68 % færre innsendte trekanter i
  Playroom og 16–23 % i Poolrooms (48 × 40 og 96 × 80). Dette er geometrimålinger, med flere
  tegnekommandoer, ikke en målt FPS-økning. Se `docs/performance.md` og `scripts/measure-render.mjs`.
- Level 0 får et renere og mer velholdt uttrykk: lysere, jevnere gulfarget tapet uten
  vannringer, roligere teppefibre uten mørke fuktflekker og en egen himlingsvariant uten
  vannskader, med færre mørke porer. Gulfarge, tapetmønster og lysrør beholdes. Delte
  himlingsplater i andre temaer er uendret. Ingen nye renderpass eller romformatendringer.
- Dekorbassengene i Mall får egen grønn mosaikk med messingdetaljer, en lav kant i rosa
  stein og roligere, mer dempet vann. Kraftige svømmebasseng-kaustikker brukes ikke her.
  Geometri og gange deler kantens fotavtrykk (`core/fountains.js`, `world/fountains.js`);
  steinkanten ligger inne i vannrutene og tar ikke av gangarealet. Poolrooms er uendret.
- Dempet utvasket standardlys i Poolrooms: mindre flisglans på gulv og vegger, svakere
  armaturglød og bloom, samt litt lavere eksponering. Grunnbelysning og refleksjoner beholdes;
  øvrige temaer og de felles lys-/refleksjonsberegningene er uendret.
- Gålinjen øverst til venstre skjules under aktiv gåmodus på PC, både i fullskjerm og i
  panelet. Kontrollene vises i pausemenyen (Esc), også tydelig under drømmegange.
  Berøringsskjermer beholder den trykkbare gålinjen.
- Vindusstil følger miljøet: sprosser er eksplisitt valgt for School, Hotel og Basement.
  Poolrooms, Office og øvrige temaer har hele glassflater; solflekkene følger samme valg.
- Automatisk vindustetthet er redusert til omtrent en fjerdedel for kontor, bassengrom,
  lekerom, skole og sykehus. Håndmalte og lagrede vinduer endres ikke. Yttervegger undersøkes
  bare én gang per generering. Kontortemaet heter nå «The Office»; natt-eksempelet beholder
  «The Office at 3 AM» og nattehimmel.
- Vinduer har fysisk karm, sprosser og vindusbrett, med innfelt glass, disig bakgrunn og
  svake refleksstriper. Sprossefrie vinduer beholder stilen sin. Ingen ekstra renderpass.
- Raskere lysbaking: eksakte tallnøkler for vanlige rutenettpunkter, gjenbruk av romlige
  lyskandidater og lineær nabotelling for dagslys. Vilkårlige punkter/normaler bruker fortsatt
  tapsfrie nøkler; siktlinjer og lysets beregning er uendret. Modellene deler én poser per rom.
- «Toggle water reflections» og «Toggle detailed water» i View-menyen er erstattet av vannvalget i
  Settings. Størrelsen på 3D-bildet regnes ut i `view3d/display.js` (før i `viewer.js`).
- Bedre dører: vridere med rund rosett og nøkkelskilt (kontor, skole, sykehus, garasje, kjøpesenter,
  basseng …) eller runde dørknotter (paneldørene i hotellet og kjelleren) i stedet for en firkantet
  kloss, tre hengsler på siden døra slår ut mot, sparkeplate i stål nederst på dørene i offentlige bygg,
  og karmlist med en hevet kant ytterst (`world/door-hardware.js`; temaets `door.handle` og `door.kick`).
  `orientedBox` er flyttet fra `world/doors.js` til `world/mesher.js`.
- Musikken spilles i tilfeldig rekkefølge: alle sporene én gang per runde, så stokkes de på nytt
  (aldri samme spor to ganger på rad). To nye spor (Liminal 3 og 4, laget med Mureka) – nå seks.
- Kiosken har fått bedre grafikk: opplyst skilt med ramme og et ikon som passer til maten (burger,
  pizzastykke, nudler, pølse i brød, pommes frites – brett i kantina og kaffe i sykehuskiosken), stripete
  markise, disk med paneler, menytavle med bilder og priser, kjøleskap med glassdør og flasker,
  brusautomat, frityr og grill, kassaapparat, servietter og ketchup/sennep, og hjørnestolper i
  kioskens farge (`world/props-kiosk.js`, grafikken i `props-kiosk-art.js` og `props-kiosk-icons.js`).
  Byggede deler som stikker utenfor fotavtrykket (`overhang`) teller ikke når gjenstanden sentreres.
- Vanninnstillingene i View-menyen er flyttet fra `app/app.js` til `app/view-settings.js`.
- Ryddigere grensesnitt (alle funksjoner er med):
  - «▶ Walk the room» oppe til høyre går rett i fullskjerm, og «🌙 Drift» ved siden av starter
    drømmegangen. Går man ut av fullskjermen (Esc) eller trykker «✕ Exit», er man tilbake i
    editoren. Knappene «Walk the room», «Drift» og «Fullscreen» i 3D-panelet er borte, og View-menyen
    har «Walk the room», «Dream walk (drift)» og «Music on/off». Der fullskjerm ikke går (iframe,
    iPhone), går man i panelet som før.
  - 3D-panelet har bare kameravalgene (3D, Top, Reset) og Photo. Stripen i 3D-vinduet har etiketter
    (Mood, Light, New levels) og ♪ Music.
  - Verktøyene er gruppert: Build, Heights, Lights og Details.
  - Sidepanelet: «Light & atmosphere» samler lysstyrke, tåke, lysfarge, vinduslys og lysknappene, og
    frø, Generate, Random og «Make it wrong» har fått en egen seksjon, «Generate». «Key figures» er
    lukket fra start.
  - HUD-en i gåmodus: «Mood: Liminal» og «✕ Exit» i stedet for «Liminal» og «Overview».
  - Hurtigtastene (Help) viser også E, P, X, G og N.
- Velgerne for stemning, lysfarge og nivåstørrelse ligger i en stripe øverst i 3D-vinduet (skjult i
  gåmodus) i stedet for i panelhodet, så knappene der («Walk the room» osv.) får plass.
- `_applyLook` (tåke, eksponering, etterbehandling) er delt ut fra `view3d/viewer.js` til
  `view3d/look.js`.
- Gjenstander som stables (lekeklossene) regnes ut én gang per kall (`poser` i
  `core/object-pose.js`, delt ut fra `core/objects.js`): lekerommet genereres ca. 25 ganger raskere i
  store rom, og samme rom blir som før.
- Katalogen bruker `ccBy()` for CC BY-krediteringen (kortere oppføringer, samme innhold).
- Starten på vannskliene er en avrundet balje (kanten er like høy rundt hele bakenden, som enden
  på et badekar) i stedet for en flat endeplate, med høyere sider de første metrene og et håndtak
  av stål over startpunktet.
- Abandoned: nesten halvparten av lysene er døde (før 20 %), og de døde lysene ligger samlet i
  områder, så hele deler av bygget er mørke – ikke bare litt dimmet overalt.
- Fottrinn på teppe er mykere og lavere: et dempet trykk uten hard landing. Flislagte deler av
  teppetemaene høres ut som fliser, og butikkene i kjøpesenteret som teppe (`tiles.step`).
- Arkademaskinen har fått egen grafikk – et oppdiktet spill, «STAR LANES», med neonstriper,
  pikselskrift og solnedgang i toppskiltet – i stedet for originalens League of Legends-grafikk
  (varemerke og kunst tilhører Riot Games). Lages av `scripts/arcade-art.mjs`; endringen står i
  krediteringen (`attribution.changes`, vises på About-siden).
- Arkademaskiner står ikke lenger i lekerommet.
- Vinduene i Poolrooms har ikke lenger sprosser (store, rene glassflater). Temaer kan slå av
  sprossene med `window: { bars: false }`.
- Romformatet er versjon 2 med de valgfrie feltene `waterDepth`, `ceilings`, `depths`,
  `floors`, `finish` og `meta` (ett tegn per rute), rutetypen trapp og listen `slides`.
  Eldre filer og lenker åpnes som før.
- Gulvlist og brystning på veggene følger gulvhøyden (veggens v-koordinat regnes fra gulvet).
- Høyder per rute ligger i `core/heights.js` og nøkkeltallene i `core/stats.js`.
- Bakt lys tar hensyn til høyde: lavere tak, døroverliggere og bassengkanter kaster skygge.
- Veggtoppene i 3D-oversikten følger det høyeste taket rundt seg, og sprang mellom ulike
  høyder lukkes.
- Verktøypanelet, peker-input i skissen, skissebildet og app-koblingene ligger nå i egne
  filer (`ui/tool-panel.js`, `editor/pointer.js`, `editor/plan-image.js`,
  `app/wiring.js`, `app/status.js`).
- Hele brukergrensesnittet er nå på engelsk (menyer, verktøy, dialoger, HUD, temaer,
  eksempler og feilmeldinger).
- Delingslenker bruker `#room=` og filformatet heter `liminal-room`; gamle `#rom=`-lenker
  og `liminal-rom`-filer kan fortsatt åpnes.
- Fyll-verktøyet har fått hurtigtasten F (før G).
- Svakere kaustikker på bassengbunnen; `THREE.Clock` er erstattet med `THREE.Timer`.
- Den konstante vannsusen i Poolrooms (som lignet hav og bølger) er fjernet; de sjeldne
  vanndryppene er beholdt (`sound.drips` i temaet).
- Fottrinn på fliser (Poolrooms) høres ikke lenger ut som stiletthæler: et dumpt slag og et
  lavt klask i stedet for skarpe klikk og ringing, og litt svakere i de ekkoaktige rommene.
- Lysrørsurret er dempet til omtrent en tredjedel, nesten borte langt fra lysene, og glir
  sakte opp og ned i stedet for å ligge jevnt hele tiden. Lydeffektene (sklie, plask, dør)
  ligger i `audio/effects.js`.
- Dørverktøyet godtar også en åpning i en vegg (gulvrute med vegg i begge ender), viser
  grønt/rødt om døren får plass, og forklarer hvorfor når den ikke gjør det.
- CRT-TV-et er dobbelt så stort, laptopen halvparten så stor (katalogen har nå `scale`).
- Romformatet har feltet `sky` (tiden på døgnet), og vinduer er vegger med `meta` = 1.
- Vinduer i genererte rom settes i ytterveggen uansett hvor tykk den er.
- Vinduer blendet i lyse rom (Poolrooms), særlig mange sammen: dagslyset legges nå til mindre jo
  lysere rommet allerede er, vinduer som sitter tett deler på lyset, glasset og solflekkene dempes i
  temaer med høy eksponering, og Poolrooms får glissere vinduer.
- Solflekker fra vinduer gikk gjennom innervegger og landet i rom uten vinduer (stripene på kryss og
  tvers i skolen): nå må hele flekken ligge på åpent gulv, ikke bare hjørnene og midten.
- Kafestolene har en ordentlig ramme: bakbeina fortsetter opp som stolper som holder ryggen, med
  stag under setet og en rygg som heller litt bakover (før svevde ryggen).
- Flimring (z-fighting) mellom kioskskiltet, taket og sideveggene.
- Vinduene skinner mindre: himmelen i glasset er dempet så den ikke blender, og dagslyset inn i
  rommet er svakere, så rom med både taklys og mange vinduer ikke «brenner ut».
- Hjelperne for lydbuffere ligger i `audio/buffers.js`; nye skumle lyder i `audio/eerie-more.js`.
- Romklangen er ikke lenger fast per tema: temaets `reverb`/`reverbTime` gir nå hvor klangfullt
  temaet er og lengden på klangen i store rom (`audio/space.js`, `audio/acoustics.js`).
- Veifinning (avstandskart over rutenettet) ligger i `world/paths.js`, felles for monsteret og
  drømmegangen; ingen av dem skjærer lenger hjørner forbi vegger eller vann.
- Gjenstander har en valgfri variant `v` (fargen på lekeklossene), og katalogen ligger i
  `core/object-catalog.js`.
- Romformatet har den valgfrie listen `objects` ({ id, x, z, rot }); ukjente modeller hoppes
  over når et rom åpnes.
- Romformatet har det valgfrie laget `decks` (dekkehøyde per rute); trapper kan lagres opp
  til 5,5 m. `groundAt`/`headAt` tar høyden man står i, og kollisjon, vern og gange velger
  etasje ut fra den. Temaene etter hotellet ligger i `core/themes-more.js`.
- Simulatoren ligger nå i `app/` (delingslenker blir `…/app/#room=…`). Gamle lenker til
  roten med `#room=`/`#rom=` sendes automatisk videre. Logoen i simulatoren lenker til forsiden.
- Poolrooms har større rom: haller deles ikke opp under 8 ruter, stopper oftere tidlig og
  har bredere åpninger; de største bassengene får 3 ruters kant.
- Fottrinnene er dempet til omtrent halvparten og mykere i anslaget på alle underlag.
- Ny dørlyd: klikk i smekklåsen, et mykt sus mens bladet svinger og et dempet dunk i karmen
  når døren lukkes, i stedet for den syntetiske knirkingen.

### Fikset
- Spøkelset spiller kun den oppreiste delen av stoffanimasjonen, rolig frem og
  tilbake med myke vendinger. Originalklippets sammenfall til et flatt laken
  spilles ikke. Størrelse og sentrering beregnes fra de samme oppreiste posene.
  Gjentatte løkker, lange bilderuter, pause og ny opptreden testes med modellens
  faktiske animerte geometri.
- Runde Poolrooms-søyler fortsetter nå ned til bassengbunnen. Den gamle firkantede
  gulvruten under søylen erstattes av bassengbunn og vann rundt sirkelen. Vannkontakt,
  kollisjon, dybdesoner, flytende gjenstander og sletting av søylen følger vannruten.
  Nye søyler husker underlaget i metadata; eldre søyler omgitt av vann gjenkjennes.
- Fottrinn dempes med 85 % i avspillingsforsterkning (ytterligere til en tredel av
  forrige demping). Fliser og betong får lengre,
  mykere anslag, lavere filtergrense, svakere bassdunk og mindre romklang, uten å
  endre volumet på øvrige lyder. Ekko-trinn beholder sin relative demping.
- Mall samles under ett eksempelkort på forsiden og i romvelgerne. Hver åpning
  trekker nytt frø og velger Gallery, Cross Court eller Terraces. Gamle variantlenker
  virker fortsatt. Terraces tilpasser inntrukket til butikkdybden (én meter ved
  standardstørrelse, to i store rom), så oppsettet også blir synlig i vanlige
  genererte og uendelige Mall-rom. Minst fire meter butikkdybde beholdes.
- Vindusnisjene i Mall får nå også komplette, tosidige sidepaneler mot de åpne
  butikkdørene. De erstatter den ensidige veggen som tidligere ble tegnet fra
  inngangsruten og forsvant ved innsyn fra vindusnisjen. Panelets 4 cm tykkelse
  legges inn i vindusfeltet, så inngangen beholder full bredde. Regresjonen dekker
  begge inngangskanter, begge butikkrekker og begge etasjer, inkludert GPU-kontroll.
- Sidepanelene i Malls vindusnisjer har nå egne baksider med 4 cm avstand og separat
  bakt lys. De forsvinner ikke ved innsyn fra motsatt side; grunnplan og øvre etasje,
  begge butikkrekker og begge nisjeender kontrolleres med raycasting og GPU-markører.
- Mall-glasstakets gavler avsluttes med sammenhengende tverrbjelker ved himlingen,
  med overlapp i begge ender og mørkere ramme. Himmelen i glasset får retningsbaserte
  skylag og mer dybde, tilpasset valgt tid på døgnet og eksponering. En liten lokalt
  generert støytekstur erstatter bølgemønsteret; ingen nye nedlastede bildeaktiva.
  Tverrbjelkene raycast-testes langs begge gavler; GPU-sjekken viser begge ender.
- Gulvet ved Malls butikkvinduer i andre etasje ser ikke lenger ut som et hull ned til
  første etasje. Glassfrontenes åpne veggdybde får lukkede sideflater mot massive pilarer
  og over tilstøtende dører, også gjennom dekkets tykkelse. Retningen på endeflatene er
  riktig ved begge ender og på begge butikkrekker. Øvre dørterskler får gulv og underside.
  Geometritester kontrollerer skrå siktlinjer, dekkekanter, terskler og dørpassasje.
  GPU-testen gjenskaper feilen ved å skjule endeflatene og verifiserer at nederste gulv
  er skjult med både Full og Reduced Effects. Rettingen gjelder også eksisterende rom.
- Tomt grensesnitt når nettleseren avviser oppretting av WebGL-kontekst, for eksempel
  etter et tidligere GPU-krasj: 3D-feilen stoppet hele App-konstruktøren før menyer,
  verktøy og rommet var lastet. Appen starter nå i 2D med tydelig forklaring og knapp
  for nytt 3D-forsøk. Rom, utkast og lagring bevares; andre programmeringsfeil skjules
  ikke. Nettlesertest gjenskaper blokkert WebGL og kontrollerer 2D, menyer, bevaring
  av siste redigering/romliste og vellykket nytt 3D-forsøk. Se `docs/graphics-recovery.md`.
- Krasj ved innlasting av rom med vindusutsikt på Direct3D11: blandede heltalls- og
  flyttallskonstruktører i den nye GLSL-koden ga en tvetydig ANGLE/HLSL-hjelpefunksjon,
  etterfulgt av tapt grafikkontekst og blokkert simulator. Vektorkonstanter bruker nå
  eksplisitte flyttall; grafikken beholdes. Feilen ble gjenskapt mot den publiserte
  siden på Intel Graphics, og rettelsen verifisert i produksjonsbygg på samme driver.
  Nettlesersjekken tester nå tegnet 2D, shaderlinking og levende WebGL-kontekst i
  Office/Playroom/Poolrooms, feiler ved konsollfeil og støtter `--hardware`.
  Alle ni utsikter er også kontrollert på Direct3D11. Se `docs/windows.md`.
- Spisst hakk og små trekantede hull ved inngangen til rørsklier: rørtaket starter nå
  med en hel bue og lukket godstykkelse i ett tverrsnitt, i stedet for at sidekantene
  trekkes sammen til en spiss. Rennen fortsetter med samme profil under taket.
  Bane, skliing og platåklaring beholdes. Stråletester dekker åpning/tetthet i fire
  retninger med og uten tidlig sving; Playroom renderkontrolleres ovenfra og fra siden.
  Se `docs/slides.md` for geometri, avgrensning og kontroller.
- Delte sol-/skymotiver og smale ekstrastriper på avrundede Playroom-vegger: hele
  hjørnebanen får riktig retning, og UV følger sammenhengende rundt buen og videre på
  rette nabovegger i meterskala. Gjelder også øvrige temaer med formede hjørner.
  Regresjonstester dekker fire retninger, innvendig/utvendig, skrå form og hevet gulv;
  egen nettleserkontroll gjenskaper feilen med Playroom-materialene (`docs/corners.md`).
  Repeterbarhetstesten som genererer maksimale Playroom-rom to ganger får 15 s tidsfrist
  for å tåle varierende maskinlast; øvrige testers tidsfrister beholdes.
- Hvite/grå felt under rulletrappene sett ovenfra skyldtes manglende gulv i trappeløpets
  fotavtrykk. Rulletrappene får nå en egen flislagt gulvflate under det frie løpet.
  Renderkontrollen tar bilder fra siden og ovenfra og bekrefter gulvet med raycasting.
- Fontenene i Mall flyttes til siden av atriets trafikkakse, med to hele gulvrader fram
  til rulletrappene. Smale atrier utelater fontener hvis de ikke får plass. Palmer fjernes
  fra automatisk Mall-møblering; de beholdes i Poolrooms. Gjelder nye rom og Mall-eksempelet.
- Platåer skjærer ikke lenger gjennom skliestarten: kort, rett og vannrett innløp med
  3 cm gulvklaring. Fallet og krengingen begynner først etter klaring fra platåkanten,
  med en myk overgang nedover. Innløpet følger endringer av platået; 2D, 3D, kollisjon og
  skliing deler samme bane. Regresjonstester dekker tidlige svinger, diagonaler, fire
  retninger, rør og større platåer (`docs/slides.md`).
- Hopp, plask og bevegelse lager synlige ringer også når «Water waves» står på «Still».
  Slideren styrer bare bakgrunnsbølgene. Renderkontrollen gjenskaper en landing og sjekker
  synlige ringer og at vannet roer seg igjen i enkel, normal og detaljert vannkvalitet.
- Mørkt rektangel i vannflaten ved stupebrett og andre dybdesoner: vannets absorpsjon bruker
  nå dybden til den synlige bassengbunnen/veggen fra det eksisterende brytningspasset, med
  riktig invers av Refractors skrå klippeprojeksjon. Dype partier er fortsatt mørkere, men
  fargeskillet følger geometrien ved bevegelse. Enkel vannkvalitet bruker en jevn vannhinne.
  Regresjonskontroll: `node scripts/check-water-depth.mjs` (skjermbilder og GPU/raycast-prøver).
- Høye taksoner (fra 8,3 m), platåer (fra 6,2 m) og dekker (fra 8,5 m) kunne gjøre lagrede rom,
  utkast, eksport og delingslenker uleselige. Romformat v3 lagrer hele høydeområdet og leser fortsatt v1/v2.
- Blokkert nettleserlagring kunne rapporteres som vellykket. Feil meldes nå uten å tildele rommet id;
  ødelagte romlister bevares og åpning/sletting gir ingen ufanget feil. Utkast varsler ved feil og
  lagres straks ved sideskifte/skjult fane, også før 600 ms-timeren har gått.
- Pause stopper nå bevegelse, fysikk, hendelser og simuleringstid, tømmer input og demper romlyden.
  Nivåoverganger venter på Resume og avbrytes når man går ut. Berøring og fallback uten pointer lock beholdes.
- Endring av innstillinger kunne starte lyden igjen etter mute eller utgang fra gåmodus.
- Tomme strøk etter angre slettet gjør-om; ved full angrestakk kunne også det eldste steget forsvinne.
- Dialoger holder nå tastaturfokus inne i dialogen og gir det tilbake ved lukking.
- Store rom bygger ikke lenger hele 3D-verdenen gjentatte ganger mens penselen beveger seg.
  three.js skilles ut i en egen, bufret byggpakke. Nye regresjonstester og `npm run test:browser`
  dekker lagring, innlesing, deling, dialogfokus, lyd og pause; `CLAUDE.md` beskriver videre arbeid.
- TV-en på TV-benken stakk 28 cm ut over forkanten og så ut til å vippe. Benken står nå litt ut
  fra veggen (`gap` i katalogen), så TV-en har forkanten i flukt og bildeskjermen henger bak.
- Lekeklossene kunne ikke dyttes etter at man hadde stått stille et sekund (spillerens
  fysikk-kropp «sovnet» og kolliderte ikke lenger med klosser i ro) – særlig stabler stod fast.
- Arkademaskinen er senket litt ned i gulvet, så den rare sokkelen under den ikke synes.
- Håndlister på rekkverk stod av og til på skrå: høyden ble lest i naborutens hjørne.
- Vernet får åpning også der en sklie går diagonalt over et hjørne av plattformen, og der
  rennen (som er bredere enn én rute) passerer tett forbi – rekkverket stod før på tvers
  over starten av sklien.
- Sklier er rundere og glattere (flere kanter og lys per hjørne), banen jevnes ut så rennen
  ikke vrir seg i svinger, og rør er åpne ved inngangen i stedet for tette i toppen.
- Glipe mellom dørblad og karm: man kunne se gjennom åpningen langs kanten av en lukket dør.
- Poolrooms-generatoren la ikke sklie i de aller største bassengrommene.

## [0.1.0] – 2026-10-17

### Lagt til
- Prosjektoppsett med Vite, three.js 0.186 og Vitest.
- Romformat med vegg, gulv, vann, søyle og døråpning, pluss lys (på, blinkende, ødelagt)
  og startpunkt.
- 2D-skisse med linjaler, rutenett, panorering/zoom og verktøyene pensel, rektangel og fyll.
- 3D-forhåndsvisning synkronisert med skissen: oversikt («dukkehus»), toppvisning og
  «Gå i rommet» i førsteperson, med fullskjerm.
- Fem temaer med prosedyrelle teksturer: Nivå 0 (gule rom), Bassengrommene, Kontoret om
  natten, Parkeringskjelleren og Hotellgangen.
- Bakt lys med skygger fra vegger, blinkende og ødelagte lysrør, tåke, bloom, filmkorn og
  valgfritt VHS-filter.
- Prosedyrell lyd: lysrørsurr, romtone, fottrinn per underlag og romklang.
- Generator for tilfeldige rom per tema og seks ferdige eksempler.
- Lagring i nettleseren («Mine rom»), eksport/import av JSON og deling via lenke.
- Autolagring av utkast, angre/gjør om (også for størrelse, generering og lys).
- 3D-oversikten sentreres på det som er bygget; massive vegger vises som tak ovenfra.
- Startpunktet vises i skissen der spilleren faktisk starter.
- Vitest-tester for romformat, serialisering, verktøy, generatorer, lys, flater og kollisjon.
