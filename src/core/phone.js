// Phone-sized touch screens use the player; tablets and mouse-based windows keep the editor.
export function phoneLayout({coarse,width,height}) {
  return !!coarse&&Math.min(width,height)<=600&&Math.max(width,height)<=1100;
}
