// Lommelykten i gåmodus (F, Light-knappen på mobil): holdes litt til høyre for og under øyet, og strålen
// henger litt etter blikket. Selve lyset ligger i shaderne (world/flashlight.js).
import * as THREE from 'three';
import { FLASH } from '../world/flashlight.js';
import { flashClick } from '../audio/effects.js';
import { drained } from '../gen/descent.js';

const POWER = 2; // full styrke (1 = som et godt opplyst rom på kloss hold)
const HAND = [0.16, -0.14]; // m til høyre for og under øyet
const FOLLOW = 18; // hvor raskt strålen følger blikket (1/s)
const FLICK = 40; // hvor raskt den slår seg på og av (1/s)
const WEAK = 0.15; // batteriet: under dette blir lyset svakere og blafrer

const forward = new THREE.Vector3();
const hand = new THREE.Vector3();

export class Flashlight {
  constructor() {
    this.on = false;
    this.level = 0;
    this.dir = new THREE.Vector3(0, 0, -1);
    this.limited = false; // batteri (The Descent); ellers varer den evig
    this.battery = 1;
    this.time = 0;
  }

  /** Batteri på (fullt) eller av. */
  fit(limited) {
    this.limited = limited;
    this.battery = 1;
    this.on = false;
  }

  /** @param audio lydmotoren, eller null med lyden av */
  toggle(audio = null) {
    if (!this.on && this.limited && this.battery <= 0) return; // tomt: bare et klikk i hodet
    this.on = !this.on;
    if (audio) flashClick(audio, this.on);
  }

  /** Av med en gang (ut av gåmodus): oversikten og editoren skal aldri ha den. */
  off() {
    this.on = false;
    this.level = 0;
    FLASH.uFlashPos.value.w = 0;
  }

  /** Nesten tomt: svakere, og et blaff nå og da. */
  _strength() {
    if (!this.limited || this.battery >= WEAK) return 1;
    const dip = Math.sin(this.time * 31) * Math.sin(this.time * 7.3) > 0.55 ? 0.35 : 1;
    return (0.35 + (0.65 * this.battery) / WEAK) * dip;
  }

  /** Etter at kameraet har fått plassen sin denne rammen. */
  update(dt, camera) {
    this.time += dt;
    if (this.limited && this.on) {
      this.battery = drained(this.battery, dt);
      if (this.battery <= 0) this.on = false;
    }
    this.level += ((this.on ? 1 : 0) - this.level) * Math.min(1, dt * FLICK);
    if (this.level < 0.01) this.level = 0;
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    if (this.level === 0) this.dir.copy(forward); // slås den på, peker den dit man ser
    else this.dir.lerp(forward, Math.min(1, dt * FOLLOW)).normalize();
    hand.set(HAND[0], HAND[1], 0).applyQuaternion(camera.quaternion).add(camera.position);
    FLASH.uFlashPos.value.set(hand.x, hand.y, hand.z, this.level * POWER * this._strength());
    FLASH.uFlashDir.value.copy(this.dir);
  }
}
