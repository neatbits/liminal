# Manual floor finishes

Select **Floor finish (T)** in the desktop editor. Choose **Theme default**,
**Tiles**, **Department store**, **Electronics**, **Arcade** or **Café**.
Paint with Brush, drag a Rectangle, or use Fill on a connected finish zone.
Walls stop Fill; doorways can connect zones, so use Rectangle to limit an open room.
Right-click restores the theme default. Undo/redo works like other zone tools.

Arcade uses the patterned carpet and dark wall panels from the generated arcade
shops. Other shop choices also apply matching wall and ceiling materials. Place
machines, shelves and furniture separately with Object (J). These finishes work
in every theme and do not require a generated shop or a glass facade.

`core/finishes.js` defines the palette. The existing `finish` layer stores raw values:
0 = theme, 1 = legacy tiles, 2 = department store, 3 = electronics, 4 = arcade,
5 = café. The v3 byte format already supports these values; no new layer is added.
Legacy Mall tiles still derive their shop style from facade identity. Manual
choices override that style locally while preserving facade detection. Footsteps
follow the painted carpet/tile material, including echo steps. Explicit choices
have their own plan colours; tile grid marks remain exclusive to Tiles.
