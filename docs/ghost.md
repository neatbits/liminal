# Svevende spøkelse

`core/ghost.js` har modellmetadata, CC BY-kreditering og ren sveve-/retningsberegning.
Modellen «Ghost from Room 226» av fatalityferi erstatter den prosedyrelle svarte
figuren i `view3d/monster.js`. Den er en NPC og står derfor ikke i objektvelgeren
eller møbleringsplanene. About viser samme kilde/skaper/lisens som øvrige modeller.

Originalens 100,8 MB buffer beholdes i `3dmodels/animated_ghost_nightmare_mode/`.
Den har 250 morphmål, men bare 60 brukes av den to sekunder lange vektanimasjonen.
`model.json.morphSamples:16` aktiverer `scripts/model-morphs.mjs`: seksten jevnt
samplede stoffposer, lineær interpolasjon og en avsluttende nøkkel tilbake til første
pose. Posisjon og normal bakes sammen. Etter forenkling og Meshopt er GLB-en ca.
746 kB. Bygg med `npm run models -- animated_ghost_nightmare_mode`.

`Monster3D.load` løser bare én lasting per instans. Scary forhåndslaster når en
stemning med monster oppdateres, før første synlige opptreden. Den ordinære
objektlasteren brukes ikke, siden den baker statisk geometri og ville fjernet
stoffanimasjonen. Originalklippet inneholder et sammenfall til et flatt laken.
`ghostClothTime` bruker bare intervallet 0–0,125 s, rolig frem og tilbake over
3,4 s med en cosinuskurve som gir myke vendinger. `AnimationMixer.setTime` får
denne avgrensede tiden ved hver oppdatering, også etter lange bilderuter.
`AnimationMixer` spiller morphene på GPU med en materialshader
som følger både animerte posisjoner og normaler. Stoffet er lesbart i mørket, følger
tåken og respekterer ugjennomsiktige vegger via vanlig dybdetest.

Høyden er 1,7 m, med ca. 23 cm svevehøyde og små rolige utslag. Bounds beregnes fra
animerte vertexer over den oppreiste løkken, ikke standard morph-bounds som også omfatter den
ubrukte baseposen. AI-posisjon/fangstregler er uendret. Både mixer og sveving står
stille ved dt=0 og mens figuren er skjult. Ressurser frigis også om lasting fullføres
etter dispose.

`test/ghost.test.js`: filbudsjett, lisens, virkelige morphmål, synlig størrelse,
retning/høyder, lazy loading, pause og async dispose. `scripts/check-ghost.mjs`
inngår i produksjonskontrollen: faktiske GPU-piksler for stoffanimasjon/sveving,
pause, skjuling og shaders. Bilder: `node_modules/.cache/ghost-front.png` og
`ghost-back.png`.
