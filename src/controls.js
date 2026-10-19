// Input math kept separate from rendering for testability.
export function stickFromOffset(dx,dy,radius,deadzone=.12){
  const distance=Math.hypot(dx,dy);
  if(!Number.isFinite(distance)||!(radius>0))return{x:0,y:0,knobX:0,knobY:0};
  const fraction=Math.min(1,distance/radius);
  const amount=fraction<=deadzone?0:(fraction-deadzone)/(1-deadzone);
  const ux=distance?dx/distance:0,uy=distance?dy/distance:0,visual=Math.min(radius,distance);
  return{x:ux*amount,y:uy*amount,knobX:ux*visual,knobY:uy*visual};
}
export function cameraKeyDirection(left,right){return Number(Boolean(right))-Number(Boolean(left));}
export function cameraSensitivity(value){const n=Number(value);return Number.isFinite(n)?Math.min(1.8,Math.max(.6,n)):1;}

/** Clamp pointer jumps and ignore accidental one-pixel twitches on attack hold. */
export function attackDragDelta(dx){return Number.isFinite(dx)&&Math.abs(dx)>=1?Math.max(-48,Math.min(48,dx)):0;}
