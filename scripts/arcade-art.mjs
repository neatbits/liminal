// Build ten original UV-compatible artwork pairs. Run: node scripts/arcade-art.mjs.
// The GLB geometry is shared; runtime loads only the variants used in the room.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { ARCADE_VARIANTS } from '../src/core/arcades.js';
import { pixelText, stars, svg } from './arcade-pixel.mjs';
import { gameScene } from './arcade-scenes.mjs';

const OUT='src/assets/arcade';
mkdirSync(OUT,{recursive:true});
const coin=await sharp('3dmodels/arcade_machine_2/textures/ParteFrontal_baseColor.png')
  .extract({left:20,top:100,width:60,height:140}).png().toBuffer();
const black={create:{width:1024,height:1024,channels:3,background:'#05060a'}};

function side(game,w,h,v) {
  const [a,b,c]=game.colors;
  let art=`<rect width="${w}" height="${h}" fill="${game.background}"/>${stars(w,h,55,v+31)}`;
  for(let k=0;k<4;k++) {
    const y=h*.35+k*34;
    art+=`<path d="M0 ${y}L${w} ${y-w*(v%2?.4:.6)}" stroke="${[a,b,c][k%3]}" stroke-width="${12+v%3*5}"/>`;
  }
  art+=`<g transform="translate(${w*.04} ${h*.33}) scale(${w/490})">${gameScene(game)}</g>`;
  return art+pixelText(game.name,w/2,h*.8,Math.floor(w/(game.name.length*7)),a);
}

function screen(game,w,h,v) {
  const [a,b,c]=game.colors;
  const px=Math.min(6,Math.floor((w-20)/(game.name.length*6)));
  return `<rect width="${w}" height="${h}" fill="${game.background}"/>${stars(w,h,45,v+7)}
    ${pixelText(game.name,w/2+2,25,px,b)}${pixelText(game.name,w/2,23,px,c)}
    ${pixelText('HI 012500',w/2,82,3,a)}${gameScene(game)}
    ${pixelText('INSERT COIN',w/2,h-57,4,a)}${pixelText('1 OR 2 PLAYERS',w/2,h-25,3,c)}`;
}

function marquee(game,w,h,v) {
  const [a,b,c]=game.colors;
  const px=Math.min(8,Math.floor((w-40)/(game.name.length*6)));
  let art=`<rect width="${w}" height="${h}" fill="${game.background}"/>${stars(w,h,45,v+3)}
    <circle cx="${w*.5}" cy="${h*.7}" r="${h*.33}" fill="${b}" opacity=".6"/>`;
  for(let i=0;i<6;i++) art+=`<path d="M0 ${110+i*12}H${w}" stroke="${a}" stroke-width="2"/>`;
  return art+pixelText(game.name,w/2+3,28,px,b)+pixelText(game.name,w/2,25,px,c);
}

function panel(game,w,h,v) {
  const [a,b,c]=game.colors;
  let art=side(game,w,h,v);
  for(let i=0;i<3;i++) art+=`<circle cx="${w*.6+i*65}" cy="${h*.5}" r="26" fill="none" stroke="${[a,b,c][i]}" stroke-width="5"/>`;
  return art+pixelText('START',w*.78,h*.8,5,c);
}

async function region(x,y,w,h,body) {
  return {input:await sharp(svg(w,h,body)).flip().png().toBuffer(),left:x,top:y};
}

for(const [v,game] of ARCADE_VARIANTS.entries()) {
  const prefix=String(v).padStart(2,'0');
  await sharp(black).composite([
    {input:coin,left:20,top:100},
    await region(0,292,550,552,side(game,550,552,v)),
    await region(553,308,446,312,screen(game,446,312,v)),
    await region(430,724,592,182,marquee(game,592,182,v)),
  ]).webp({quality:90}).toFile(`${OUT}/${prefix}-front.webp`);
  await sharp(black).composite([await region(198,526,826,376,panel(game,826,376,v))])
    .webp({quality:90}).toFile(`${OUT}/${prefix}-panel.webp`);
  console.log(`${prefix}: ${game.name}`);
}
