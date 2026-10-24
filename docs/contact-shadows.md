# Kontaktskygger

`core/contact-shadows.js` velger myk sokkel-, potte- eller beinprofil og finner den
faktiske mottakerflaten. Rene gulvflater klippes per rute, med lik gulvhøyde; vegger,
vann og formede hjørner utelates. Oppå en pult/benk eller stablet skumkloss klippes
skyggen til flaten under. Skyggene er lokale til objektet, med verdensrettet fotavtrykk
etter rotasjon. Vegg- og takmonterte gjenstander får ingen slik skygge.

`world/contact-shadows.js` lager et delt 64 × 192 RGBA-atlas fra tre analytiske masker.
Hver plassert gjenstand har én mesh, ett delt materiale og bare de nødvendige
gulv-/bordutsnittene. Polygon offset og 4 mm høydeforskjell unngår z-fighting.
Ingen ny lyskilde, framebuffer, nettverksressurs eller ekstra renderpass.

Myke/løse gjenstander bruker fortsatt en hel bevegelig skyggeflate og eksisterende
SoftPlay-oppdatering. Dette er en stilisert kontaktskygge, ikke en dynamisk projeksjon
av modellens silhuett. Veltede møbler beholder sin opprinnelige skyggeprofil.

`test/contact-shadows.test.js` tester maskene og mottakerflatene. Produksjonssjekken
`scripts/check-interior-polish.mjs` måler forskjellen i faktiske GPU-piksler med/uten
skyggene, kontrollerer delt materiale og PC-skygge på bordplaten. Skjermbilde:
`node_modules/.cache/contact-shadows.png`. Geometri/materialer frigjøres av objektenes
vanlige dispose; det lille delte atlaset beholdes i sidens teksturcache.
