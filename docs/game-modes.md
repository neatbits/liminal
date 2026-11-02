# Spot the wrong og The Descent

To spillmoduser ved siden av Tape hunt, Lights out og Daily level. Begge starter fra hovedmenyen, Play-menyen eller `app/#spot` og `app/#descent`
(`playRun` i `app/actions.js`, sidene i `ui/run-dialogs.js`), og begge rydder etter seg i `stop()` når man går ut. Stemningen settes med
`quietMood`, som verken viser melding eller lagres, og den spilleren hadde, settes tilbake. Drømmegangen er av (`walk.noDrift`). Rekordene ligger i
`liminal.runs.v1` (`loadRuns`/`saveRuns`), med tall som kan bli Steam-topplister.

## Spot the wrong

`gen/spot.js` (ren logikk), `view3d/spot.js`. Én gang per forsøk, valgt blant `SPOT_THEMES`, med to dører til ingensteds: bak deg og i enden.
Alt som før: gå videre. Noe feil: snu. Åtte riktige på rad, så er du ute (`SPOT.GOAL`).

- Første runde og runden etter en feil er alltid som den skal være, så man får se gangen.
- Hver runde er en kopi av grunnlaget (`spotRound`). 60 % av rundene har én endring.
- Endringene kommer fra «Make it wrong» (`applyChange` i `gen/wrong.js`) og `OWN` i `gen/spot.js`. `TIERS` går fra det tydelige til det subtile, og hvert tredje
  riktige svar flytter trekningen ett trinn opp. Samme endring kommer ikke to ganger på rad. Nye endringer legges i `TIERS`, og de må være til å se fra gangen.
- Stemningen er Normal: ingen strømbrudd eller hendelser bak ryggen, så alt som er annerledes, er svaret.
- Ved feil svar forteller tittelen hva man overså (`what`).

## The Descent

`gen/descent.js` (ren logikk), `view3d/descent.js`, `view3d/batteries.js`. Ett liv, stadig dypere nivåer.

- Stemningen følger dybden (`descentMood`): Abandoned, Liminal fra nivå 2, Uncanny fra 4 og Nightmare fra 7.
- Skikkelsen kan ta deg fra nivå 4 (`DESCENT.LETHAL`). Da er forsøket over, og den er ikke lenger snill i Uncanny. Krypeganger er eneste skjul.
- Lykten har batteri (`Flashlight.fit`): 200 sekunder med lyset på, svakere og blafrende under 15 %. Et batteri på gulvet fyller 45 %.
- Kassettene som åpner døren, bestemmes av `descentTapes` (`explorer.tapeCount`, `view3d/tape-placing.js`), og alle ligger i etasjen man kommer inn i.
- Går man ut midt i et forsøk, teller dybden i rekorden.

Tester: `spot.test.js`, `descent.test.js` og nettlesersjekken `check-modes.mjs`.

## Noclip

`gen/noclip.js` (ren logikk) og `view3d/noclip.js`. Man starter i en fast oppsatt møbelbutikk (`storeLevel`, skjult tema `store`
i `core/themes-more.js`: lyst, dagslys gjennom vinduene foran, lager med betong via belegget). På lagerveggen er en firkant tegnet
(`noclipmark`, `world/props-rooms.js`); `level.noclip = { x, z, dx, dz }` er ruten foran og retningen mot veggen. Står man inntil og
ser mot den i `NOCLIP.PUSH` s (`againstMark`), glir man gjennom: første nivå er alltid Level 0 (`theme(1)`, `nextLevel(..., forced)`),
og der legger `markWall` en firkant tilbake til butikken rett der man kommer inn (`storeReturn` er stedet i butikken).

Innenfor er det én sammenhengende verden uten dører (`gen/zones.js`, `view3d/zones.js`): hvert område har en gang inn i vest og ut i øst
(`SEAM`: 8 × 3 ruter ved kanten, samme takhøyde og lamper), og neste område legges slik at gangene ligger oppå hverandre (`zoneOffset`).
Området man er i og naboene er bygget; hvert klippes til sin side av skjøten midt i gangen (`world/clip.js`, `renderer.localClippingEnabled`).
Krysser man skjøten, blir naboen verdenen man går i (`storeys.adopt`, verdener med `zone` eies av områdene) og alt flyttes til origo,
så det ikke synes. Tåken glir over til det nye temaet (`view3d/fog-light.js`). Neste område lages i bakgrunnen (`view3d/zone-worker.js`:
`makeZone` og de tunge flatene med bakt lys, `world/world-meshes.js`, ferdig delt i biter og sendt uten kopiering; ellers på hovedtråden).
Uten hakk (målt på ekte GPU: byttet 3–5 ms, de fleste overganger uten bilder over 50 ms – før opptil 1,2 s): teksturene males og lastes opp
i små biter (`world/texture-warm.js`), 3D-en settes sammen (`buildWorld` med `prebuilt`), gjenstandene bakes i et felles tidsbudsjett per
bilde (`world/frame-budget.js`), skyggeleggerne kompileres i bakgrunnen mot etterbehandlingens buffer, og området legges inn litt om gangen
(`view3d/zone-show.js`). Romklangen og de skumle lydene for neste tema lages på forhånd (`audio/space.js`, `audio/eerie-pool.js`). Igjen:
første gang i en økt man går inn i vann eller speilgulv (bare området man går i, har speiling), kompileres den varianten der og da. Uendelige ganger og hendelser bak
ryggen er av (de bygger om). Det er alltid en vei fra inngangen til gangen ut til fots (`gen/zone-paths.js`: `walkReach` med høyder,
krypeganger og faste møbler; ellers graves korteste vei, med jevn gulvhøyde). `world/clip.js` setter klippebitene inn på egne linjer. Ingen kassetter (`tapeCount` 0). Stemningen følger dybden (`noclipMood`: Liminal, Abandoned, Uncanny – aldri
Nightmare, så skikkelsen viser seg, men tar deg ikke). Rekorden er dypeste nivå og lengste avstand i meter (`loadRuns().noclip`).

Explorer har modusene i `runs` (spot, descent, daily, noclip): den aktive gir HUD-linjen og kan gripe inn med `beforeLevel(depth)`,
`theme(depth)`, `prepare(level, depth)` og `arrive()` (Noclip bruker ingen av dem: områdene erstatter dørene).

Kartet nede til høyre (`view3d/minimap.js`, øverst til høyre på berøringsskjerm) viser det man har sett: åpne ruter innen `SIGHT` (9 m) med fri sikt
fra øyehøyde (`world/discover.js`, `zone.seen`), med vegger rundt og en pil for blikket, nord opp og sammenhengende over skjøtene. M (et trykk på kartet på berøringsskjerm)
gjør det stort midt på skjermen (ca. 90 m på tvers); i Noclip er M derfor kartet, ikke lyden (`view3d/viewer-keys.js`).

Ikke ferdig ennå: at 3D-byggingen av neste område også blir usynlig (bygges i dag på hovedtråden), mer butikkinnredning (venter på modeller).
Ekspeditøren bak kassen er modellen `cashier` (`docs/models.md`). Test: `noclip.test.js`, `noclip-zones.test.js`, nettlesersjekken `check-noclip.mjs` (bilder i `node_modules/.cache/noclip-*.jpg`).
