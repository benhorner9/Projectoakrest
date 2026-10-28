/** Canvas-space weapon grip shared by preparation, contact and recovery.
 * Directions 5–7 mirror the entire rig rather than swapping a floating weapon. */
export function classicGrip(style,pose='idle',step=0,weapon='sword'){
 const lifts={prepare:-4,windup:-10,swing:-3,strike:7,follow:9,recover:3,'work-raise':-20,'work-contact':12,'work-recover':-4};
 const lift=lifts[pose]??(step===1?4:step===2?-4:0);
 const hand={x:72,y:84+lift};
 const axe=/axe/i.test(weapon),quick=/dagger/i.test(weapon);
 const angles={prepare:axe?0:.12,windup:axe?0:quick?.12:.2,swing:-.35,
  strike:quick?-.7:-1.05,follow:-.85,recover:-.3,
  'work-raise':.52,'work-contact':-1.18,'work-recover':-.22};
 return {hand,weapon:{x:hand.x,y:hand.y-(style==='magic'?35:style==='ranged'?8:26)},
  angle:angles[pose]||0,bowDraw:pose==='windup'||pose==='swing'?10:pose==='prepare'?5:0,
  cast:style==='magic'&&pose==='strike'};
}
export function mirroredDirection(dir){
 const n=((Math.round(dir)%8)+8)%8;return {dir:n>4?8-n:n,mirror:n>4};
}
