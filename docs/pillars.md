# Runde søyler i Poolrooms

`core/pillars.js` er felles definisjon av fotavtrykket. Poolrooms bruker sirkler;
andre temaer beholder kvadratiske søyler. Eksisterende søyler med metadata 0 blir
automatisk runde i Poolrooms. Metadata 0/1/2/3 velger diameter 0,5/1/2/3 meter.
Dette bruker allerede lovlige verdier i romformat v3 og følger kloning, eksport,
deling, angre og størrelsesendring. En annen rutetype nullstiller metadata.

Bit 2 i søylemetadata husker vann under en Poolrooms-søyle; de to nederste bitene
velger fortsatt diameteren. Eldre søyler med vann på alle fire sider og uten hevet
gulv gjenkjennes. `core/pillar-water.js` deler underlaget mellom høyder, bassengbunn,
vannflate og gange. Søylen går helt til lokal bassengdybde, med sammenhengende UV-er
over vannlinjen. Ingen firkantet sokkel eller tørt gulv blir igjen. Sletting med
søyleverktøyet gjenoppretter vann og beholder dybden. Dybdeverktøyet og genererte
bassengdybder inkluderer søylens rute.

Søyleverktøyet har egen diametervelger. Store søyler kan bare plasseres der hele
fotavtrykket får plass, med klaring mot vegger, dører, trapper og andre søyler.
Penselstørrelsen bestemmer hvilke ruter som forsøkes; diameteren gjelder hver
søyle. 2D-skissen og pekeren viser faktisk form og bredde. `gen/pool-pillars.js`
velger større søyler med større mellomrom i romslige bassenghaller.

`world/pillars.js` bygger 32 eller 48 segmenter med radial normal per vertex til
det bakte lyset. Hele teksturrepetisjoner rundt omkretsen lukker UV-sømmen;
høydekoordinatene følger gulvet i hver etasje. Materialet deler rommets fliser.
Ingen ekstra materialer eller tegnekall. Søylene bygger på de eksisterende gulv-
og dekkelagene, som før.

Gåeren kolliderer med sirkler i Poolrooms og bokser ellers. Naboruter undersøkes
ut fra største søyleradius, så store søyler stopper spilleren før ankerruten.
Startpunkt, veifinning, møblering og sklier bruker samme fotavtrykk. Løse objekter
får stående sylindre i Cannon; taklamper inne i brede søyler utelates.

`test/pillars.test.js` dekker geometri, normaler, UV-søm, kollisjon fra alle
retninger, naboruter, lys, editorverktøy, generering og lagring. Produksjonssjekken
`check-pool-pillars.mjs` tester diameterknappen og GPU-gjengivelsen. Bildet ligger i
`node_modules/.cache/pool-round-pillars.png`.
