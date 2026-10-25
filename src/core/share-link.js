// Delte rom som lenke: hele rommet ligger i lenken (#room=…, serialize.js encodeLevel). Programmet
// (Electron) lager lenker til nettsiden, siden dets egen adresse (app://…) ikke virker for andre,
// og kan åpne en innlimt lenke (app/shared-link.js). Ren logikk.

export const SHARE_PARAM = 'room';
export const WEB_APP = 'https://liminalsimulator.com/app/'; // der delte lenker fra programmet åpnes

// #room=… (nå) og #rom=… (lenker fra første, norske versjon).
const HASH = /#(?:room|rom)=([^\s#&]+)/;

/** Lenken til et rom: på siden man er på, eller (base) en fast adresse. */
export function shareUrl(code, base) {
  return `${base}#${SHARE_PARAM}=${code}`;
}

/** Koden fra en delt lenke (hele adressen, bare #room=…, eller selve koden), eller null. */
export function shareCode(text) {
  const t = String(text ?? '').trim();
  const m = HASH.exec(t);
  if (m) return m[1];
  return /^[\w-]{16,}$/.test(t) ? t : null; // en kode alene (base64url)
}
