// Verktøytilstanden i 2D-skissen: valgt verktøy, form, pensel og verdiene verktøyene maler med.
// Editor arver den (og gir invalidate()); set-metodene kalles fra appen (app/wiring.js).
import { ZONES } from '../core/zones.js';
import { DOOR } from '../core/doors.js';
import { CORNER } from '../core/corners.js';
import { DEFAULT_SLIDE_COLOR } from '../core/slides.js';
import { OBJECT_IDS } from '../core/objects.js';
import { toolById } from './tools.js';

export class ToolState {
  constructor() {
    this.tool = toolById('floor');
    this.shape = 'brush';
    this.brush = 1;
    this.pillarDiameter = .5;
    this.zone = { ceiling: 4, depth: 1.5, floor: 1.2, finish: 1, deck: 4 }; // høyden soneverktøyene maler (m)
    this.doorState = DOOR.CLOSED; // dørene dørverktøyet setter inn
    this.cornerKind = CORNER.ANGLED; // skrått eller avrundet (hjørneverktøyet)
    this.slideTube = false; // nye sklier: åpen renne eller lukket rør …
    this.escalatorDown = false;
    this.slideColor = DEFAULT_SLIDE_COLOR; // … og fargen (SLIDE_COLORS)
    this.objectId = OBJECT_IDS[0]; // gjenstanden objektverktøyet setter inn
    this.ledColor = 1; // LED-stripens farge (1–8, se core/leds.js)
    this.panelType = 1; // lyspaneltype (1–3, se core/panels.js)
  }

  /** Aktivt verktøy; sone- og dørverktøy får høyden/dørtilstanden de skal bruke som `value`. */
  get activeTool() {
    const t = this.tool;
    if (t.id === 'pillar') return { ...t, diameter: this.pillarDiameter };
    if (t.kind === 'zone') return { ...t, value: this.zone[t.layer] };
    if (t.kind === 'door') return { ...t, value: this.doorState };
    if (t.kind === 'corner') return { ...t, value: this.cornerKind };
    if (t.kind === 'object') return { ...t, value: this.objectId };
    if (t.kind === 'slide') return { ...t, value: this.slideTube };
    if (t.kind === 'led') return { ...t, value: this.ledColor };
    if (t.kind === 'panel') return { ...t, value: this.panelType };
    if (t.escalator) return { ...t, down: this.escalatorDown };
    return t;
  }

  setTool(id) {
    this.tool = toolById(id);
    this.invalidate();
  }

  setShape(id) {
    this.shape = id;
    this.invalidate();
  }

  setBrush(n) {
    this.brush = Math.max(1, Math.min(9, n));
    this.invalidate();
  }

  setZoneValue(layer, metres) {
    this.zone[layer] = ZONES[layer].clamp(metres);
    this.invalidate();
  }

  setSlideTube(tube) {
    this.slideTube = tube;
  }

  setSlideColor(color) {
    this.slideColor = color;
  }

  setDoorState(state) {
    this.doorState = state;
  }

  setObjectId(id) {
    this.objectId = id;
  }

  setCornerKind(kind) {
    this.cornerKind = kind;
  }

  setLedColor(color) {
    this.ledColor = color;
  }

  setPanelType(type) {
    this.panelType = type;
  }
}
