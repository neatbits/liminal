# Endringslogg

Alle merkbare endringer i prosjektet føres her.
Formatet følger [Keep a Changelog](https://keepachangelog.com/no/1.1.0/), og prosjektet
bruker [semantisk versjonering](https://semver.org/lang/no/).

## [Ukommet]

### Lagt til
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
