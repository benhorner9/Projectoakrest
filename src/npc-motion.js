/**
 * Deterministic, allocation-free heading smoothing for ambient NPCs.
 * Three.js Y rotation wraps at +/- PI; ordinary linear interpolation
 * would make villagers spin the long way around at route reversals.
 */
export function approachHeading(current,target,dt,rate=8){
 if(!Number.isFinite(current)||!Number.isFinite(target))return 0;
 const alpha=Math.max(0,Math.min(1,(Number.isFinite(dt)?dt:0)*(Number.isFinite(rate)?rate:0)));
 const difference=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+difference*alpha;
}

/** Pick the closest person across roaming and stationary citizens. */
export function nearestCitizen(villagers,standing,x,z,maxDistance=2.7){
 let nearest=null,distance=maxDistance;
 for(const citizen of [...villagers,...standing]){
  const delta=Math.hypot(x-citizen.x,z-citizen.z);
  if(delta>=distance)continue;
  const line=citizen.line??citizen.route?.line;
  nearest={type:'citizen',id:citizen.name,label:citizen.name,role:citizen.role,line,distance:delta};
  distance=delta;
 }
 return nearest;
}
