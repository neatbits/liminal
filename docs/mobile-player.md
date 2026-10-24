# Telefonspiller

`core/phone.js` velger telefonmodus ved grov peker og kortside ≤600 / langside
≤1100 CSS-piksler. Testen er orienteringsuavhengig og kjøres ved oppstart; en
rotasjon midt i en vandring bytter ikke apptype. Musevinduer og større nettbrett
beholder editoren. Touch-baserte nettbrett beholder eksisterende sveipestyring.

`main.js` leser delings-/eksempellenker før den oppretter enten App eller
`app/mobile-player.js`. Telefonspilleren erstatter editorens DOM, oppretter ingen
Editor/Sidebar, binder ingen editorsnarveier og skriver aldri et utkast. Den viser
eksempler, eventuelt lenkerom/eksisterende utkast og lokalt lagrede rom. Ett trykk
bygger valgt rom og starter gåmodus. Starten er en brukerhandling, slik at lyd kan
startes i nettlesere med autoplay-begrensninger. Innstillinger lagres som før.

Mobilens 3D-flate fyller viewport med 100dvh og plass til safe-area-insets. Ingen
native fullscreen kreves. Pausemenyens «Choose a room» avslutter gåmodus og viser
romvelgeren, og stopper skjult 3D-rendering mens velgeren vises. Mood og grafikkinnstillinger kan endres uten å åpne editoren. Blokkert
WebGL viser gjenopprettingsmelding; lagrede rom og utkast beholdes.

`view3d/touch-controls.js` binder faktiske pointer-hendelser til en separat
`WalkInput.buttons`-samling, så fysiske taster og skjermknapper ikke avbryter hverandre.
Flerberøring lar spilleren holde retning + Run/Jump samtidig. Capture/end/cancel
og input-reset frigjør knapper. Touch ber ikke om pointer lock, som ellers kan
frata knappene deres normale pointer-hendelser. Høyre skjermhalvdel beholder
WalkInputs sveiping for blikk. Use følger samme dørrutine som tast E; prompten
sier «Tap Use» på berøringsenheter. Pause/bakgrunnsfane bruker WalkSession.

`test/phone.test.js` og `walk-session.test.js` kontrollerer valg og input. Produksjons-
kontrollen `scripts/check-mobile-player.mjs` sender ekte berøringshendelser i Chrome:
gå/løpe, sveipe, hoppe, dørbruk i delt rom, pause/resume, rombytte, liggende layout,
ingen editor og uendret utkast. Bildene ligger i `node_modules/.cache/phone-*.png`.
Dette er mobil-emulering på maskinens GPU; native Safari/fullscreen og ytelse på
fysiske telefoner er ikke målt av denne testen.
