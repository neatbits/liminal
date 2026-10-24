/** Kreditering for en CC BY 4.0-modell fra Sketchfab: credit-teksten og attribution (About-siden). */
export function ccBy(title, author, source, authorUrl, changes = 'scaled and optimized for real-time rendering') {
  return {
    credit: `“${title}” by ${author} (CC BY 4.0)`,
    attribution: { title, source, author, authorUrl, license: 'CC BY 4.0', licenseUrl: 'http://creativecommons.org/licenses/by/4.0/', changes },
  };
}

