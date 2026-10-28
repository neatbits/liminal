# Programmet (Electron) og Steam

Liminal Simulator kan kjøres som et vanlig program (Windows og Linux, også Steam Deck) med
Electron: Chromium følger med, så WebGL, lyd, fullskjerm og muselås virker som i Chrome.

## Kommandoer

- `npm run desktop` – bygger (`dist/`) og åpner programmet.
- `npm run desktop:check` – bygger, åpner programmet usynlig og sjekker at 3D-verdenen, WebGL,
  lagring, den medpakkede fonten, modellene, startmenyen og tilbakemeldingene virker, og avslutter
  (PASS/FAIL). Bruker en egen, midlertidig datamappe, så lagrede rom ikke røres og et åpent vindu
  ikke stopper den.
  Den pakkede versjonen sjekkes med `"release/win-unpacked/Liminal Simulator.exe" --check`.
- `npm run desktop:dist` – lager `release/win-unpacked/` og `release/linux-unpacked/` (mappene
  Steam vil ha). Ingen installasjonsprogram: Steam installerer selv.

`scripts/desktop.mjs` fjerner `ELECTRON_RUN_AS_NODE` (VS Code setter den for alt det starter,
og da kjører Electron som vanlig Node: «does not provide an export named 'BrowserWindow'»).

## Slik er det bygget

- `desktop/main.mjs`: vinduet og protokollen `app://liminal/`, som serverer `dist/` (adressene:
  `desktop/files.mjs`, ren logikk, `test/desktop-files.test.js` – ingenting utenfor bygget).
  Egen, sikker opprinnelse, så `localStorage` (rom, utkast, innstillinger, kassettfremgang) lagres
  i programmets brukermappe (Windows: `%APPDATA%/Liminal Simulator/`, satt fast i `main.mjs`,
  siden den urørte exe-en ikke har produktnavnet i seg).
- Starter i simulatoren (`app/index.html`) med **startmenyen** (`src/app/start-menu.js`): Game mode,
  Continue, New room, Examples, My rooms, Settings, About & credits og Quit. Logoen øverst og
  File → Main menu åpner den igjen; File → Quit og Ctrl+Q avslutter. `window.liminalDesktop`
  (`desktop/preload.cjs`) slår dette på; på nettsiden er alt som før (`scripts/check-start-menu.mjs`
  prøver begge). Forsiden har ingen reklameplass i programmet. Lenker ut åpnes i nettleseren;
  egne sider (About fra dialogen) i samme vindu.
- Ikonet (`desktop/icon.png`, 512 × 512 med gjennomsiktige hjørner) er korridoren fra forsiden.
- Delte lenker: «Share link» i programmet lager lenker til `https://liminalsimulator.com/app/#room=…`
  (`WEB_APP` i `core/share-link.js`), siden programmets egen adresse (`app://…`) ikke virker for
  andre. File → «Open shared link …» åpner en innlimt lenke (også gamle `#rom=`-lenker og koden alene).
  **Når nettversjonen tas ned:** la `liminalsimulator.com/app/` bli en liten side som forteller at
  rommet åpnes i programmet (lim inn lenken) og lenker til Steam – ellers peker delte lenker til en
  side som ikke finnes. Senere kan en `steam://run/<app-id>//…`-lenke åpne rommet direkte.
- Tilbakemeldinger (`../api/feedback.php`) sendes av hovedprosessen til
  `https://liminalsimulator.com/api/feedback.php` med nettstedets `Origin`, siden skjemaet bare
  godtar det (`feedback-lib.php`). Grensen per IP-adresse gjelder som før.
- Fonten (VT323, OFL) pakkes med via `@fontsource/vt323` – også på nettsiden, så ingen side
  kontakter Google lenger.
- Starter i fullskjerm. F11 eller View → Fullscreen bytter, og valget huskes til neste oppstart
  (`window.json` i brukermappen, `desktop/window-state.mjs`). Gåmodusens egen fullskjerm og muselås
  virker som i nettleseren, og vinduet blir værende i fullskjerm når man går ut av gåmodus
  (`npm run desktop:check -- --fullscreen` prøver det synlig).
- `force_high_performance_gpu`: bærbare med to skjermkort bruker det kraftige.
- Bare engelske språkfiler fra Chromium (`electronLanguages`), ingen `node_modules` (alt er buntet
  av Vite). Windows ≈ 340 MB utpakket, Linux ≈ 300 MB; mest Chromium.

## Bilder til butikksiden

1. **Skjermbilder** (minst fem, 1920 × 1080 eller større, 16:9): ta dem selv i programmet med
   fotomodusen (**P**). I programmet har de ikke vannmerke, og de lagres rett i
   `Pictures\Liminal Simulator`. VHS-teksten (▶ PLAY, dato) er bare med når VHS-filteret er på
   (Settings). Tips: fullskjerm, Render scale 1 eller høyere, og vis både rom og Game mode.
2. **Kapsler og bibliotekbilder**: `npm run steam:capsules -- <bredt bilde> [høyt bilde]` lager alle
   i `release/steam/` med tittelen i VT323: `header_capsule` (920 × 430), `small_capsule` (462 × 174),
   `main_capsule` (1232 × 706), `vertical_capsule` (748 × 896), `library_capsule` (600 × 900),
   `library_hero` (3840 × 1240, uten tekst), `library_logo` (1280 × 360, gjennomsiktig),
   `library_header_capsule` (920 × 430), `event_cover` (800 × 450), og ikonene `shortcut_icon.png`
   (256 × 256) og `app_icon.jpg` (184 × 184) av `desktop/icon.png`. Det brede
   bildet brukes til de brede kapslene og helten – ta det i så høy oppløsning som mulig; det høye
   (valgfritt) til de høye (`scripts/steam-capsules.mjs`).

## Gjenstår før Steam

1. **Steamworks**: konto, Steam Direct-avgift (100 USD), app-id, butikkside, aldersmerking.
2. **Opplasting**: SteamPipe-depoter fra `release/win-unpacked` og `release/linux-unpacked`.
   Startvalg i Steamworks (Installation → General):
   - Windows: kjørbar fil `Liminal Simulator.exe`, ingen argumenter.
   - Linux (og Steam Deck): kjørbar fil `liminal-simulator`, argumenter `--no-sandbox`. Steams
     Linux-runtime gir ikke Chromiums sandkasse (`chrome-sandbox`) rettighetene den trenger, og uten
     argumentet krasjer programmet ved oppstart. Last opp Linux-depotet fra Linux eller WSL, så
     filene beholder kjørerettighetene.
   - Alternativ for Deck: bare Windows-depotet, kjørt med Proton.
3. **Steam-integrasjon** (valgfritt): `steamworks.js` i hovedprosessen for prestasjoner (f.eks.
   dypeste nivå, alle kassetter), overlegg og skylagring. Overlegget krever ofte ekstra
   Chromium-valg (f.eks. `--in-process-gpu`) og må prøves på ekte.
4. **Skylagring**: Steam Auto-Cloud kan peke på brukermappen, men `localStorage` er en LevelDB-
   database. Tryggere: lagre rommene som JSON-filer i en egen mappe som synkroniseres.
5. **Steam Deck**: Linux-bygget kjører direkte. For «Deck Verified» trengs håndkontroll
   (Gamepad API), som ikke finnes ennå.
6. **Lisenser**: CC BY-modellene tillater salg, men krever kreditering i programmet (About-siden
   følger med). Musikken er laget med Mureka – sjekk at abonnementet gir kommersiell rett, og oppgi
   AI-generert innhold i Steams innholdsskjema.
7. **Smart App Control (Windows 11)** blokkerer ukjente, usignerte exe-filer («En programkontroll-
   policy har blokkert denne filen»). Løsningen uten sertifikat: exe-en er Electrons egen fil, helt
   urørt (`win.signAndEditExecutable: false`, `asar: false` – ellers skriver electron-builder ikon,
   navn og en asar-kontrollsum inn i den). Den filen kjøres av svært mange, så Windows kjenner den
   igjen; prøvd med Smart App Control på (samme SHA-256 som `node_modules/electron/dist/electron.exe`).
   Det koster:
   - exe-filen har Electrons ikon og heter «Electron» i Oppgavebehandling (vinduet og oppgavelinjen
     bruker vårt ikon; Steam bruker egne ikoner fra Steamworks),
   - appen ligger som vanlige filer i `resources/app/`, ikke i én `app.asar`,
   - oppgrader Electron først når en versjon har vært ute en stund (en helt ny exe er ukjent).
   Vil man ha eget ikon og navn på exe-en, trengs et kodesigneringssertifikat (OV fra f.eks. Certum,
   Sectigo eller SSL.com, eller Microsofts Trusted Signing); fjern da de to valgene og legg inn
   `win.signtoolOptions` / `win.azureSignOptions`. Ikke slå av Smart App Control for å teste: den kan
   ikke slås på igjen uten å installere Windows på nytt.
8. **Steam-grafikk**: kapsler (920×430, 462×174, 1232×706, 748×896, 600×900), bibliotekshelt
   (3840×1240), logo og minst fem skjermbilder i 1920×1080 (fotomodus, P).
9. **Ikke prøvd ennå**: fullskjerm og mus i det ekte vinduet (sjekken kjører usynlig), og Linux-bygget
   på en Linux-maskin eller Steam Deck.
