import { describe,it,expect,vi,afterEach } from 'vitest';
import { phoneLayout } from '../src/core/phone.js';
import { WalkInput } from '../src/view3d/input.js';

afterEach(()=>vi.unstubAllGlobals());
describe('phone player selection and controls',()=>{
  it('uses the player on phones in either orientation, keeping mouse windows/tablets editable',()=>{
    for(const [width,height] of [[390,844],[844,390],[430,932],[932,430]])expect(phoneLayout({width,height,coarse:true})).toBe(true);
    for(const [width,height,coarse] of [[390,844,false],[1280,800,false],[1024,768,true],[1366,600,true]])
      expect(phoneLayout({width,height,coarse})).toBe(false);
  });
  it('keeps held touch buttons separate from keys and clears both on pause/reset',()=>{
    vi.stubGlobal('window',new EventTarget());const input=new WalkInput(new EventTarget());
    input.buttons.add('KeyW');input.buttons.add('ShiftLeft');input.buttons.add('Space');
    input.keys.add('KeyD');expect(input.forward).toBe(1);expect(input.strafe).toBe(1);
    expect(input.running).toBe(true);expect(input.jumping).toBe(true);
    input.keys.clear();expect(input.forward).toBe(1);expect(input.strafe).toBe(0);
    const reset=vi.fn();input.onReset=reset;input.reset();
    expect(input.forward).toBe(0);expect(input.running).toBe(false);expect(input.jumping).toBe(false);expect(reset).toHaveBeenCalledOnce();
    input.dispose();
  });
});
