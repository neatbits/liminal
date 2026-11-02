# Krypeganger

Lave, mørke ganger man må krype gjennom. Rutetypen er `TILE.CRAWL` (romformat v5).

## Kroppen

- Taket står alltid `CRAWL_HEIGHT` (0,9 m) over gulvet (`ceilingAt`); `ceilings` gjelder ikke her.
  Lys kan ikke henge i en krypegang (`canHaveLight`), og omgivelseslyset ganges med `CRAWL.SHADE`.
- C (mobil: Crawl-knappen) slår `walker.wantDown` av og på. `walker.down` er om man faktisk kryper: valgt, eller fordi
  det ikke er plass til å stå. Står man, stopper kollisjonen en ved åpningen (`tooHigh`, kroppshøyden sendes
  inn til `moveCircle`). Nede holder hele fotavtrykket en nede (`canStand`), så man ikke reiser seg med skulderen
  under overkanten. Hopp virker ikke nede. `walker.stand()` brukes ved stiger, sklier og nytt startpunkt.
- `crawlPrompt` gir hintene (C – crawl / C – stand up). Dører og stiger går foran.

## Generering (`gen/crawlways.js`)

De fleste vegger er én rute tykke, så gangen trenger en blokk: et rektangel på 6–9 ruter fylles til massiv vegg, og
gangen graves inni. Blokker som fyller minst gulv prøves først. Fra åpningen går gangen inn, gjennom en
sving, og ender enten ut på andre siden (snarvei) eller i en utvidelse på 2 × 2 ruter (blindgang).

- `generateLevel` legger dem inn med `vary` og eget frø, før møbleringen (`clearDoorways` holder også åpningene fri etterpå, `crawlFronts`); eksemplene har ingen.
- Stemningen legger til flere i genererte nivåer (`crawl` i `MOODS`, bare nederste etasje). Aldri i rommet fra editoren.
- Blokken må aldri stenge noe man når uten å krype: kroppen, skikkelsen og drømmegangen må klare seg uten gangene
  (`keepsAll`). Den holder seg unna dører, trapper, vinduer, gjenstander, sklier og startpunktet. Mall står utenfor.
- Hotellet er tett bygd, så romfløyen har massive felt (sjakter) der gangene kan gå, og mange hotellnivåer får ingen. Planløsningene beskytter rom med et bestemt innhold (`CRAWL_FREE` i `gen/index.js` er unntakene). Ellers får nesten alle nivåer minst én. En stemningsomgang koster 3–60 ms.

## Kassetter

`placeTapes` legger gjerne (60 %) én kassett i en utvidelse (`crawlNooks`). `reachableCells` regner gangene som åpne.

## Skikkelsen

Den kommer aldri inn (`noCrawl` i `world/paths.js`), og dukker aldri opp der. Er man bak en krypegang, bruker den
avstandskartet med gangene åpne for å finne nærmeste åpning, og stopper der. Sett innenfra synes bare beina under overkanten. Etter
`PATIENCE` sekunder gir den opp og holder seg borte i `AWAY` sekunder, ellers ville den i Nightmare sperret en blindgang for
alltid. Den er farlig helt inne ved åpningen (`CATCH`). Drømmegangen bruker ikke gangene.

## 3D

`world/caps.js` regner gangene som massiv vegg, så blokken er hel sett ovenfra. Overkanten mot rommet kommer fra
de vanlige flatene for lavere tak hos naboen (`world/surfaces.js`).

## Tester

`crawl.test.js`, `crawlways.test.js`, `crawl-figure.test.js` og nettlesersjekken `check-crawl.mjs`
(skjermbilder i `node_modules/.cache/crawl-*.png`).
