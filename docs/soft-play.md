# Polstrede lekeklosser

De fem opprinnelige formene og tre nye (`softramp`, `softcylinder`, `softsteps`)
bruker samme `soft`-system, åtte farger og lagrede objektvarianter. Nye former
møbleres inn gjennom `gen/softplay.js`, som brukes av Playrooms `PLANS`.

`world/soft-geometry.js` lager avrundede bokser innenfor katalogmålene, med 216
delte vertexer og 300 trekanter. `world/soft-forms.js` lager avrundede profiluttrekk
og sylinderputer. Alle former bruker én renderdel. `soft-texture.js` tegner ett
768 × 512 atlas per form, delt mellom fargene, med deterministisk vinylkorn,
meterskalerte sømmer/sting og en liten lapp. Ingen eksterne bildeteksturer.

Objektshaderens `SOFT_VINYL` aktiverer dempet glans bare på disse delene. Normaler
beholdes gjennom `object-light.js`; `normalMatrix` følger faktisk modellrotasjon
også etter at klossen har veltet. Glansen skaleres med bakt lys, tint og strøm.

Katalogens `softForm` velger fysikk i `world/soft-shapes.js`: konveks rampe fra
samme rene sideprofil som grafikken (`core/soft-forms.js`), sylinder eller to
overlappfrie trinnbokser. Stabling/plassering beholder konservative fotavtrykksbokser.
De nye formene er lave (0,4 m), og følger eksisterende gangregel for lave klosser.
Fysikken endrer ikke det lagrede rommet; pause/reset følger vanlig `SoftPlay`.

`npm test` dekker mål, utjevnete normaler, vertexbudsjett, profiltreff i fire
rotasjoner, dytting etter hvile, temabruk og lagring/deling. Produksjonssjekken
`npm run test:browser -- --hardware` viser alle åtte former/farger, verifiserer
materialdeling, dimensjoner, synlig glans og Full/Reduced-shadere. Forhåndsbilde:
`node_modules/.cache/soft-blocks.png`.
