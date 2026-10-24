// Egne, fiktive skilt uten eksterne bilder, logoer eller skrifter. Fire skilt i ett atlas.
import { makeCanvas } from './paint.js';

function signs(color, accent, labels) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  labels.forEach(([title, subtitle], row) => {
    const y = row * 128;
    ctx.fillStyle = '#323a3a';
    ctx.fillRect(0, y, S, 128);
    ctx.fillStyle = color;
    ctx.fillRect(4, y + 4, S - 8, 120);
    ctx.fillStyle = accent;
    ctx.fillRect(18, y + 20, 6, 88);
    ctx.fillStyle = '#f2ebda';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(title, 42, y + 54, 440);
    ctx.fillStyle = accent;
    ctx.font = '19px sans-serif';
    ctx.fillText(subtitle, 42, y + 91, 440);
  });
  return canvas;
}

export const mallSigns = () => signs('#365d5d', '#d4b98b', [
  ['GALLERIA', 'SHOPS & LEISURE'], ['THE ATRIUM', 'PLEASE ENJOY YOUR VISIT'],
  ['SHOPPING HOURS', '10:00 – 20:00'], ['INFORMATION', 'THANK YOU FOR VISITING'],
]);
export const playSigns = () => signs('#446e96', '#ebca80', [
  ['SOFT PLAY', 'SOCKS ONLY'], ['PLAY SAFE', 'TAKE TURNS'],
  ['QUIET CORNER', 'TIME FOR A LITTLE REST'], ['WELCOME BACK', 'LET YOUR IMAGINATION PLAY'],
]);
export const schoolSigns = () => signs('#355d56', '#c7bb91', [
  ['CLASSROOMS', 'PLEASE WALK QUIETLY'], ['SCIENCE WING', 'LEAVE THE LIGHTS ON'],
  ['AFTER SCHOOL', 'COLLECTION AT 16:00'], ['NOTICE BOARD', 'TERM ENDS ON FRIDAY'],
]);
