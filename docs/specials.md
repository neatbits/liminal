# Spesialrom

Et rom i et generert nivå blir noe uventet (`gen/specials.js`, katalogen i `gen/special-rooms.js`). Hvert enkelt er
sjeldent, men det er mange, så omtrent to av tre nivåer har ett (målt: 66 % av 275 nivåer i alle temaer, 48 × 40).
Bare med `vary` (ikke i eksemplene), ikke i kjøpesenteret (`NO_SPECIALS`), med eget frø (`seed ^ 0x5bec`), etter
møbleringen og før `clearDoorways`.

## Rommene

`findRooms`: områdene av gulv og søyler mellom vegger, dører, trapper og vann. Et område på 9–260 ruter som fyller
minst 70 % av rektangelet sitt, er et rom (`enclosed`), unntatt der man starter. I større områder (Level 0, parkering,
haller) prøves ledige felt på 5–10 × 5–10 ruter av gulv og søyler (`openPatch`), minst 4 ruter fra startpunktet; de
passer bare spesialrom som ikke trenger vegger (`area` i stedet for `room` i katalogen).

## Sikkerhet

Det som stod i rommet, fjernes først (også det som stikker inn i det, og det som stod oppå). Etter `apply` sjekkes:
alt man nådde fra start utenfor rommet, nås fortsatt (`reachableCells`), de nye gjenstandene får plass (`objectFits`), og
nivået har ikke flere enn `MAX_OBJECTS`. Ellers angres alt (`snapshot`/`applySnapshot`) og neste type prøves.

## Katalogen

`{ id, fits(level, room), apply(level, rand, room), not?, themes? }` – `apply` returnerer `false` når den ikke fikk det til.
Nå: flooded, poolroom, chairgrid, waitingroom, darkroom, tallroom, lowroom, tvroom, clockroom, plantroom, vending,
pillarforest, lonebed, stairsnowhere, ledroom, panelroom, chairpiles, shelfmaze, dormitory, fanroom. Nye typer: legg dem i
`SPECIALS` (og gjenstandene i `SPECIAL_ITEMS`); testene i `test/specials.test.js` prøver hver type i et vanlig rom.

`level.specials` (id-ene) og `level.specialRooms` (hvor) er til tester og sjekker og lagres ikke.
