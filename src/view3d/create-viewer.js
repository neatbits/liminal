import { Viewer } from './viewer.js';
import { UnavailableViewer } from './unavailable.js';

export function createViewer(container, options) {
  try {
    return new Viewer(container, options);
  } catch (error) {
    // Bare manglende grafikkontekst: ikke skjul programmeringsfeil i andre deler.
    if (!/WebGL.*context|context.*WebGL/i.test(error.message)) throw error;
    console.warn('3D graphics could not start; keeping the 2D editor available.', error);
    return new UnavailableViewer(container, options, error);
  }
}
