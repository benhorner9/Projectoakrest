/** Combat decisions use 600 ms beats; movement/projectiles use fixed 60 Hz
 * simulation steps. Rendering never decides how many attacks occur. */
export const COMBAT_TICK_SECONDS=.6;
export const SIMULATION_STEP=1/60;
export const STEPS_PER_COMBAT_TICK=36;
export function classicWeaponTicks(weapon){
 return Math.max(1,Math.ceil(((Number(weapon?.interval)||.6)-1e-9)/COMBAT_TICK_SECONDS));
}
export const classicWeaponInterval=weapon=>classicWeaponTicks(weapon)*COMBAT_TICK_SECONDS;
export const nextCombatBeat=time=>Math.ceil((time-1e-9)/COMBAT_TICK_SECONDS)*COMBAT_TICK_SECONDS;
export const onCombatBeat=time=>Math.abs(time/COMBAT_TICK_SECONDS-Math.round(time/COMBAT_TICK_SECONDS))<1e-7;
export function createClassicSimulationClock(){
 let accumulator=0,steps=0;
 return {advance(elapsed,update){
  if(!Number.isFinite(elapsed)||elapsed<=0)return 0;
  // A suspended browser is a pause, never a burst of deferred attacks.
  if(elapsed>1){accumulator=0;return 0;}
  accumulator+=elapsed;
  const count=Math.floor((accumulator+1e-9)/SIMULATION_STEP);
  accumulator=Math.max(0,accumulator-count*SIMULATION_STEP);
  for(let i=0;i<count;i++){steps++;update(SIMULATION_STEP,steps*SIMULATION_STEP);}
  return count;
 },resetRemainder(){accumulator=0;},state:()=>({time:steps*SIMULATION_STEP,steps,accumulator})};
}
