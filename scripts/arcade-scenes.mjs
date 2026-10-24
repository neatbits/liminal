// Ten distinct attract-mode scenes, all drawn from original geometric pixel art.
const rect = (x,y,w,h,c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const line = (x,y,a,b,c,w=3) => `<path d="M${x} ${y}L${a} ${b}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
const circle = (x,y,r,c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;

export function gameScene(game) {
  const [a,b,c]=game.colors;
  let art='';
  switch(game.motif) {
    case 'space':
      for(let z=0;z<3;z++) for(let x=0;x<7;x++) art+=rect(56+x*48,125+z*25,18,10,z%2?a:b);
      art+=`<path d="M223 192l-18 27h12v14h12v-14h12z" fill="${c}"/>`;
      break;
    case 'road':
      art+=`<path d="M184 112H262L410 238H36z" fill="#444253"/>`;
      for(let i=0;i<6;i++) art+=rect(220,120+i*20,6,10,c);
      art+=rect(209,188,28,43,a)+rect(215,192,16,13,b)+rect(203,201,6,20,'#090c15')+rect(237,201,6,20,'#090c15')+circle(330,133,18,c);
      break;
    case 'ocean':
      for(let i=0;i<5;i++) art+=line(20,125+i*24,426,125+i*24,b,1);
      art+=`<path d="M140 180h130l22 18-22 16H140l-16-16zM190 180v-18h30v18" fill="${a}"/>`;
      art+=circle(167,198,7,b)+circle(192,198,7,b)+circle(217,198,7,b);
      for(let i=0;i<7;i++) art+=circle(305+i*10,175-i*6,2+i%3,c);
      break;
    case 'maze':
      for(let i=0;i<5;i++) art+=`<path d="M${35+i*35} 128v${100-i*15}h${320-i*60}v-${70-i*12}h-${260-i*55}" fill="none" stroke="${i%2?a:b}" stroke-width="6"/>`;
      for(let x=70;x<380;x+=25) art+=rect(x,140,4,4,c);
      art+=rect(212,184,16,16,c);
      break;
    case 'lunar':
      art+=circle(335,143,28,b)+`<path d="M0 234l50-22 36 8 54-17 45 16 70-12 55 24 51-15 85 18v10H0z" fill="${a}"/>`;
      art+=rect(188,150,32,22,c)+line(189,171,179,190,c,4)+line(220,171,230,190,c,4)+rect(199,179,10,18,b);
      break;
    case 'blocks':
      for(let y=0;y<6;y++) for(let x=0;x<10;x++) if(y>3||((x+y)%4===0)) art+=rect(109+x*22,116+y*19,20,17,[a,b,c][(x+y)%3]);
      art+=rect(197,124,20,17,b)+rect(219,124,20,17,b)+rect(219,105,20,17,b);
      break;
    case 'jungle':
      for(let i=0;i<4;i++) art+=rect(25+i*110,125,12,120,b)+`<path d="M${i*110} 150l35-40 45 40z" fill="${a}"/>`;
      art+=rect(50,222,130,9,c)+rect(242,191,130,9,c)+rect(144,195,14,27,b)+rect(142,185,18,14,c);
      break;
    case 'robot':
      art+=rect(190,127,65,44,b)+rect(180,176,85,42,a)+rect(165,180,12,47,b)+rect(270,180,12,47,b);
      art+=rect(197,221,18,18,b)+rect(233,221,18,18,b)+rect(202,140,12,10,c)+rect(235,140,12,10,c)+rect(216,188,17,17,c);
      break;
    case 'tennis':
      art+=`<path d="M115 125h215l60 113H55z" fill="${b}" stroke="${c}" stroke-width="3"/>`;
      art+=line(88,181,360,181,a,5)+line(221,125,221,238,c,2)+rect(142,198,11,28,a)+rect(284,136,9,23,a)+circle(250,168,6,c);
      break;
    case 'pinball':
      art+=`<path d="M120 116h208l30 121H90z" fill="none" stroke="${a}" stroke-width="5"/>`;
      for(const [x,y] of [[176,149],[260,149],[218,191]]) art+=circle(x,y,15,b)+circle(x,y,7,c);
      art+=line(139,225,191,237,c,8)+line(298,225,246,237,c,8)+circle(291,197,5,'#fff');
      break;
  }
  return art;
}
