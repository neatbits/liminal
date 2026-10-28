// Broadphase for fysikken i gåmodus (world/softphysics.js): løse gjenstander og spilleren mot hundrevis
// av faste vegg- og gulvbokser. cannon-es sin SAPBroadphase går gjennom alle par av faste bokser hvert
// steg (den bryter ikke søket for dem), så tiden vokser med kvadratet av antall vegger – 9–17 ms per
// bilde i store nivåer. Her søkes det bare fra det som kan bevege seg: hver våken kropp mot de faste
// kroppene i rutenettet rundt seg og mot de andre som beveger seg, hver sovende bare mot de andre som
// beveger seg. Parene som kan gi kontakt er de samme (kontakt krever overlappende AABB-er); smalfasen
// avgjør som før. Ingen three.js.
import * as CANNON from 'cannon-es';

const { STATIC, SLEEPING } = CANNON.Body;
const CELL = 4; // m: rutenettet de faste kroppene sorteres i (vannrett)
const WIDE = 32; // faste kropper over så mange celler på en led (gulvplanet, høydefelt) sjekkes alltid

const cellOf = (v) => Math.floor(v / CELL);

export class MoverBroadphase extends CANNON.Broadphase {
  constructor() {
    super();
    this.movers = [];
    this.count = -1;
    this.grid = new Map(); // celle → faste kropper som når inn i den
    this.wide = []; // faste kropper som er for store til rutenettet
    this.seen = new Map(); // fast kropp → siste søk den ble funnet i (så den bare tas én gang)
    this.query = 0;
  }

  /** Kropper legges bare til når fysikken lages; faste kropper blir aldri dynamiske og flyttes aldri. */
  _index(bodies) {
    this.count = bodies.length;
    this.movers = bodies.filter((b) => b.type !== STATIC);
    this.grid.clear();
    this.wide = [];
    for (const b of bodies) {
      // cannon regner ut AABB-en når formen legges til, og merker den ikke utdatert når posisjonen
      // settes etterpå (veggene plasseres etter at de er laget): regn ut alle én gang.
      b.updateAABB();
      if (b.type !== STATIC) continue;
      const { lowerBound: lo, upperBound: hi } = b.aabb;
      const [x0, x1, z0, z1] = [cellOf(lo.x), cellOf(hi.x), cellOf(lo.z), cellOf(hi.z)];
      if (!(x1 - x0 < WIDE && z1 - z0 < WIDE)) {
        this.wide.push(b);
        continue;
      }
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const key = `${x},${z}`;
          const list = this.grid.get(key);
          if (list) list.push(b);
          else this.grid.set(key, [b]);
        }
      }
    }
  }

  collisionPairs(world, p1, p2) {
    const bodies = world.bodies;
    if (this.count !== bodies.length) this._index(bodies);
    // Det som beveger seg: hvert steg (spilleren flyttes med position.set, som heller ikke merker den).
    for (const b of this.movers) b.updateAABB();
    const { movers } = this;
    for (let i = 0; i < movers.length; i++) {
      const a = movers[i];
      const test = (b) => {
        if (this.needBroadphaseCollision(a, b) && a.aabb.overlaps(b.aabb)) this.intersectionTest(a, b, p1, p2);
      };
      for (let j = i + 1; j < movers.length; j++) test(movers[j]);
      if (a.sleepState === SLEEPING) continue; // sovende møter ikke faste kropper
      for (const b of this.wide) test(b);
      const q = ++this.query;
      const { lowerBound: lo, upperBound: hi } = a.aabb;
      for (let z = cellOf(lo.z); z <= cellOf(hi.z); z++) {
        for (let x = cellOf(lo.x); x <= cellOf(hi.x); x++) {
          for (const b of this.grid.get(`${x},${z}`) ?? []) {
            if (this.seen.get(b) === q) continue;
            this.seen.set(b, q);
            test(b);
          }
        }
      }
    }
  }

  aabbQuery(world, aabb, result = []) {
    for (const b of world.bodies) {
      if (b.aabbNeedsUpdate) b.updateAABB();
      if (b.aabb.overlaps(aabb)) result.push(b);
    }
    return result;
  }
}
