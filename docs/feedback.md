# Suggestions og kontakt

Knappene på forsiden, About og i simulatoren åpner samme dialog (`src/ui/feedback.js`).
Brukeren velger Suggestion, Bug report eller Comment, skriver meldingen og kan oppgi
en e-postadresse for svar. Mottakeren er alltid **hello@liminalsimulator.com**.
Rom, delingslenker og andre appdata legges ikke ved.

## Publisering og e-post

- `public/api/feedback.php` og `feedback-lib.php` kopieres automatisk til `dist/api/` av Vite.
  Vanlig `npm run deploy` laster dem opp sammen med resten av bygget. Publiser hele `dist/`.
- Webhotellet må kjøre PHP 8+ og støtte `mail()`. Ingen SMTP-passord ligger i nettleseren
  eller kildekoden. `To` og `From` er faste; brukerens validerte adresse brukes bare i `Reply-To`.
- På one.com må To eller From være en aktiv e-postkonto på domenet. Kontroller at
  **hello@liminalsimulator.com** er opprettet og aktiv. Se
  [one.coms veiledning](https://help.one.com/hc/en-us/articles/115005594345-Can-I-send-emails-from-my-website).
- Etter publisering: send én avtalt test fra skjemaet og kontroller innboks og søppelpost.
  Lokal testing bruker en falsk transport og bekrefter ikke levering til innboksen.
  PHPs `mail()` bekrefter bare at meldingen er akseptert for levering,
  [ikke at mottakeren har fått den](https://www.php.net/manual/en/function.mail.php).
- Vites dev-/preview-server kjører ikke PHP. Der viser ekte innsending en feilmelding
  med kontaktadressen; `npm run test:browser` avskjærer forespørslene og tester alle svar lokalt.

## Spambeskyttelse og personvern

- Bare JSON POST fra samme origin godtas. Mottaker, avsender og emne kan ikke overstyres.
- Et skjult `website`-felt er honeypot. Utfylling gir et stille svar uten e-postsending.
- Maks én innsending per minutt og fem per time per IP; maks 60 per time totalt per installasjon.
  Reservasjonen skrives før sending, også om e-posttransporten feiler, slik at parallelle
  forespørsler eller gjentatte feil ikke kan omgå grensen. HTTP 429 har `Retry-After`.
- Maks 20 000 byte i forespørselen; melding 10–4000 Unicode-tegn; valgfri e-postadresse
  valideres uten linjeskift. Skjemaet hindrer doble innsendinger og beholder teksten ved feil.
- Kvoter lagres under PHPs `sys_get_temp_dir()/liminal-feedback-<installasjonshash>/limits.json`,
  utenfor webroten. `flock` beskytter mot parallelle skrivere. Bare IP-hash og tidsstempler
  lagres der; ikke meldinger, e-postadresser eller rå IP. Oppføringer eldre enn én time ryddes
  ved neste aksepterte innsending. Feil i kvotelagringen avviser innsending, uten å hoppe over vernet.
- Meldingen og eventuell svaradresse beholdes i mottakerens e-postsystem. Ingen tredjeparts
  skjematjeneste eller sporingscookies brukes. Dette beskrives også på About-siden.

## Tester

- `npm test`: vanlige Vitest-regresjoner.
- `npm run test:feedback`: syntakssjekk og PHP-tester av validering, faste e-posthoder,
  honeypot, kvoter, utløp og feil. Sender ingen e-post. Krever PHP 8+ på PATH, i `PHP_PATH`
  eller som lokal testbinær i `node_modules/.cache/php/php.exe`.
- `npm run test:browser`: bygger og tester skjemaene på alle tre sider, korte meldinger,
  dobbeltklikk, HTTP 429/503, ny innsending og suksess med avskåret nettverk. Dekker også at
  New room åpnes ved vanlig oppstart, kan lage rom og fortsette et utkast, og ikke åpnes ved
  delte rom eller eksempellenker. Ingen e-post sendes fra testene.
