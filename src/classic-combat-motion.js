/** Presentation reads simulation time; it never schedules damage or cooldowns.
 * A small finite pose vocabulary keeps the sprite texture cache bounded. */
export function combatRecoverySeconds(family){
 return family==='greatsword'?.36:family==='daggers'?.20:.28;
}
export function classicAttackPose(time,action,release){
 if(action){
  const span=Math.max(.001,action.until-action.startedAt);
  const progress=Math.max(0,Math.min(1,(time-action.startedAt)/span));
  return progress<.3?'prepare':progress<.76?'windup':'swing';
 }
 if(release){
  const age=time-release.time,duration=combatRecoverySeconds(release.family);
  if(age>=0&&age<duration)return age<.08?'strike':age<duration*.6?'follow':'recover';
 }
 return 'idle';
}
export function classicEnemyProfile(enemy,spec){
 const caster=enemy.type==='bandit'&&spec.kind==='pounce'&&spec.engage>6;
 return {caster,speed:enemy.type==='bandit'?2.5:enemy.type==='boar'?2.2:1.75,
  standOff:caster?spec.engage*.68:Math.min(2.5,spec.engage*.75),
  recovery:caster?.34:spec.kind==='charge'?.38:spec.kind==='cleave'?.3:.18};
}
export const CLASSIC_DEATH_SECONDS=.65;
export function classicDeathProgress(enemy,time){
 if(!enemy.dead||!Number.isFinite(enemy.deathAt))return null;
 return Math.max(0,Math.min(1,(time-enemy.deathAt)/CLASSIC_DEATH_SECONDS));
}
