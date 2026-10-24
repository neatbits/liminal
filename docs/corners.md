# Formede hjørner: geometri og veggteksturer

`core/corners.js` er felles kilde for hjørnenes form, kollisjon, lys og 2D-tegning.
Rettelser av utseendet skal ikke endre rommets lag eller flytte kollisjonsgrensen.

`world/corners.js` tegner grensen fra venstre mot høyre sett fra åpent rom. For et
innvendig hjørne må **hele punktlisten** snus før veggstripene bygges. Hvis hvert
segment snus alene mens UV fortsatt teller fremover i den gamle rekkefølgen, får
nabosegmentene ulike teksturkoordinater ved samme punkt. Dette delte Playrooms sol
og laget smale ekstrastriper i polstringen.

`world/wall-textures.js` lager et oppslag for sammenhengende veggløp gjennom formede
hjørner. UV øker med den faktiske lengden langs veggen, én enhet per meter. Også
tilstøtende rette vegger må bruke oppslaget; ellers flyttes feilen bare til buens
ender. Skarpe hjørner eller tvetydige forgreninger avslutter et løp. Løp uten
formede hjørner beholder sine opprinnelige verdenskoordinater.

Et helt avrundet, lukket løp trenger én avslutningsskjøt: omkretsen er vanligvis
ikke et helt antall teksturrepetisjoner. Skjøten legges på en rett vegg. Teksturene
strekkes ikke for å skjule den. Oppslaget bygges kun ved rombygging og legger ikke
til geometri, materialer, draw calls eller arbeid per ramme.

`v = y − gulvhøyde` beholdes, slik at brystning og list følger hevede gulv.

Gulv og tak i en formet rute deles opp med samme `S` som vanlige ruter, og skygges med de samme
reglene (`cornerShade` i `surfaces.js`). Punktene på kantene mot naborutene bruker bare
rutenettskyggen, slik naboen gjør; inne i ruten mørkner det i tillegg inn mot den formede veggen,
like mye som ved en vanlig vegg. Ellers får teppet en egen trekantet gradient i hjørnet.
`corners.test.js` krever samme lys i alle gulvpunkter som deler plass, for alle fire hjørnetyper.

Kontroller ved endringer:

- `npx vitest run test/corner-texture.test.js test/corners.test.js`: sammenhengende
  UV inne i buen og mot rette vegger, riktig meterskala og flateretning, hevet gulv,
  alle fire retninger, innvendig/utvendig og skrå/avrundet form.
- `node scripts/check-corners.mjs`: ekte Playroom-materialer i hodeløs Chrome,
  innvendig/utvendig bue, shaderfeil og skjermbilder i `node_modules/.cache/corner-*.png`.
  SwiftShader er en renderkontroll, ikke en måling av fysisk GPU-ytelse.
- `npm test` og `npm run test:browser` (sistnevnte bygger også produksjonsutgaven).
