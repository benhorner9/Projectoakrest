/** Basic weapon cadence is enforced regardless of touch/keyboard tapping frequency. */
export function basicAttackReady(now,nextReady,pending=false) {
  return Number.isFinite(now) && now>=nextReady && !pending;
}
export function attackCooldown(nextReady,interval,now) {
  const remaining=Math.max(0,nextReady-now);
  const total=Math.max(0.01,interval);
  return {remaining,progress:Math.max(0,Math.min(1,1-remaining/total)),ready:remaining<=0};
}
export function projectileTravel(distance,speed,dt,maxDistance) {
  const left=Math.max(0,maxDistance-distance);
  const step=Math.min(left,Math.max(0,speed)*Math.max(0,dt));
  const next=distance+step;
  return {step,distance:next,expired:next>=maxDistance-1e-6};
}
export function weaponDisplay(w) {
  return `${w.basic} damage · ${w.interval.toFixed(2)}s/attack · ${w.reach.toFixed(1)} range`;
}
