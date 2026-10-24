# Arkademaskiner

Alle ti maskindesign bruker samme `models/arcade_machine_2.glb`. Materialene `ParteFrontal`
og `Caixa` får egne teksturer for sidekunst/skjerm/topp og kontrollpanel; joystick og knapper
beholder originalmaterialene. Krediteringen for geometrien står fortsatt på About-siden.
All spillgrafikk er egen og beskrives i krediteringens endringsmerknad.

`src/core/arcades.js` beskriver ti fiktive spill og velger variant fra `x + 3*z` modulo 10.
Ti naboceller langs begge akser får dermed alle designene. Rotasjon endrer ikke designet.
Eksisterende rom trenger ingen migrering. Et eksplisitt `v` velger bestemt design og bruker
romformatets eksisterende variantfelt. Ingen nye objekttyper eller endringer i generatorfrø.

`src/world/arcade-textures.js` laster bare brukte teksturpar og bufrer dem per variant.
Geometrien og like materialer deles. Teksturene har glTFs `flipY=false`, sRGB og mipmaps.
Vite tar med alle tjue WebP-filer fra `src/assets/arcade/` med hashede URL-er.

Bygg grafikken med `node scripts/arcade-art.mjs`. Generatoren bruker `sharp`,
`arcade-pixel.mjs` og `arcade-scenes.mjs`. Originalmodellens UV-regioner beholdes, og hvert
tegnet felt snus loddrett før sammensetting. Samlet filbudsjett er under 1 MB. Genereringen
endrer ikke kildemodellens teksturer eller GLB-filen; variantene erstatter kartene ved lasting.

Kabinettets bunn ligger 0,2996 m over modellens laveste punkt, der den feilplasserte delen
under maskinen starter. `lift=-0.305` setter kabinettet omtrent 5 mm ned i gulvet.
Katalogen bruker hele modellhøyden 2,145 m, som gir synlig topp rundt 1,84 m over gulvet.
Kontaktskyggen ligger fortsatt på selve gulvet. Hevede gulv får samme relative senking.

`test/arcades.test.js` dekker variantfordeling og rotasjon, lagring/deling, unike teksturfiler,
filbudsjett og senking. `scripts/check-arcades.mjs` kjører i den vanlige produksjonssjekken:
alle ti design, materialdeling, bildenes orientering, synlig geometri og GPU-piksler.
Forhåndsbildet lagres som `node_modules/.cache/arcade-variants.png`.
