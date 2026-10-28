// Appens verktøyvalg: endrer verktøytilstanden i editoren (editor/tool-state.js) og holder
// sidepanelet og statuslinjen i synk. Legges på App.prototype i app.js.
export const toolMethods = {
  setTool(id) {
    this.editor.setTool(id);
    this._syncTool();
  },

  setShape(id) {
    this.editor.setShape(id);
    this._syncTool();
  },

  setBrush(n) {
    this.editor.setBrush(n);
    this._syncTool();
  },

  setZoneValue(layer, metres) {
    this.editor.setZoneValue(layer, metres);
    this._syncTool();
  },

  setDoorState(state) {
    this.editor.setDoorState(state);
    this._syncTool();
  },

  setSlideTube(tube) {
    this.editor.setSlideTube(tube);
    this._syncTool();
  },

  setEscalatorDown(down) {
    this.editor.escalatorDown = down;
    this._syncTool();
  },

  setSlideColor(color) {
    this.editor.setSlideColor(color);
    this._syncTool();
  },

  setLedColor(v) {
    this.editor.setLedColor(v);
    this._syncTool();
  },

  setPanelType(v) {
    this.editor.setPanelType(v);
    this._syncTool();
  },

  setObjectId(id) {
    this.editor.setObjectId(id);
    this._syncTool();
  },

  setCornerKind(kind) {
    this.editor.setCornerKind(kind);
    this._syncTool();
  },
};
