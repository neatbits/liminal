# Sklier: innløp, platåklaring og røråpning

`core/slides.js` beregner én `slidePath` for 2D-skissen, 3D-rennen, kollisjon,
rekkverksåpningene og skliingen. Endre denne banen når form eller høyde endres.

- `core/slide-curve.js` glatter banen og holder de første `SLIDE.LAUNCH` (1,2 m)
  rette i den tegnede startretningen, med myk overgang til resten av kurven.
- `core/slide-launch.js` undersøker hele rennens bredde mot plattformen. Den flate
  delen forlenges når startpunktet ligger lenger inne på et platå. Lengden undersøkes
  også ved cachetreff, slik at redigering av platåkanten oppdaterer banen.
- Bunnen starter `SLIDE.LIP` (3 cm) over gulvet. Dette hindrer både gjennomskjæring
  og flimring mellom sammenfallende gulv- og renneflater.
- Høyden holdes til `path.launch`, deretter faller den med en jevn overgang til
  `SLIDE.EXIT`. Krengingen fases inn etter den flate delen. `path.h0` er gulvhøyden;
  selve rennebunnen starter i `path.h0 + SLIDE.LIP`.
- Det må være minst 0,6 m bane igjen etter innløpet. Hvis plattformen strekker seg
  helt til utløpet, viser skissen at sklien trenger mer plass etter plattformen.
- `Rider` har en liten minimumsfart, så man kommer over innløpet før tyngdekraften
  tar over. Utløpets plassering og vannhøyde beholdes.

Sklieobjekter og punktlister behandles fortsatt som immutable. Lagrede rom bruker
samme punktformat; innløpet beregnes på nytt ved åpning. Ingen formatmigrering trengs.

## Røråpning

`world/slide-shell.js` beholder rennens profil også inne i røret og legger et eget
buet tak over den. Første lukkede tverrsnitt ligger minst 1,3 m fra starten (normalt
1,4 m med banens 0,2 m sampling). Takets forkant er en sammenhengende bue i dette
tverrsnittet, med en synlig kant som lukker godstykkelsen på 5 cm. Passasjen er fri.

Ikke trekk sidekantene gradvis sammen til ±π igjen: dette laget et spisst hakk i
taket, og tvinnede profilquads kunne vise små trekantede hull ved inngangen.
Rennen og taket deler nøyaktig de samme profilendepunktene langs begge sider.

Taket har ti segmenter over buen og deler materialene/meshene med resten av sklien;
det tilføres ingen nye materialer eller tegnepass. Åpen renne beholder sin geometri.
Dette endrer bare det synlige skallet. Bane, innløpsklaring, kollisjon, skliing og
romformat beregnes fortsatt av de samme funksjonene som før.

## Kontroll

- `npm test -- test/slide-entry.test.js test/slides.test.js test/rider.test.js`
  kontrollerer platåklaring, tidlige svinger, diagonaler, fire retninger, renne/rør,
  redigering av platået, start fra plattformen og en fullført sklietur.
- `npx vitest run test/slide-tube.test.js` kontrollerer med stråletreff at hele
  takbuen møter samme plan, at passasjen er fri og skallet tett fra begge sider.
  Dekker fire retninger og tidlig sving; romdata og den delte banen skal være uendret.
- `node scripts/check-slide-entry.mjs` renderer åpen renne, rør og start lenger
  inne på et platå, samt Playrooms røråpning ovenfra og fra siden.
  Bilder ligger i `node_modules/.cache/slide-entry-*.png`. Valgfritt suffiks som
  `before`/`after` bevarer sammenligningsbilder. SwiftShader er ingen fysisk GPU-måling.
- Kjør også `npm test` og `npm run test:browser` før endringen avsluttes.
