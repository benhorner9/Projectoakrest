/** Visual-only input adapter from Oakrest's authoritative simulation to the
 * skinned actor. No gameplay movement, ability triggers, damage or cooldowns.
 * Can be exercised by QA without replacing the working game player.
 */
const finite=x=>Number.isFinite(x);
export function selectSkeletalLocomotion({moving=false,speed=0,side=0,backwards=false,combat=false,turn=0}={}){
 if(!moving&&speed<=.12){
  if(turn>.3)return 'TurnRight';
  if(turn<-.3)return 'TurnLeft';
  return combat?'Ready':'Idle';
 }
 if(backwards)return 'Backstep';
 if(side<-.26)return 'StrafeLeft';
 if(side>.26)return 'StrafeRight';
 return speed>=2.65?'Run':'Walk';
}
const weaponFamily={sword:'sword',greatsword:'greatsword',daggers:'dagger',
 bow:'bow',shortbow:'bow',crossbow:'crossbow',frost:'staff',ember:'wand'};
export function createSkeletalMotionController(hero){
 if(!hero?.playAbility||!hero?.sampleAbility||!hero?.update)throw Error('Skinned hero required');
 let state='Idle',actionId=null,failed=0;
 function transition(name,fade=.14){
  if(state!==name){hero.play(name,fade);state=name;actionId=null;}
  return name;
 }
 function tick(input={}){
  const {dt=0,t=0,dead=false,hit=false,dodge=false,working=false,
   family='sword',abilityId='basic',attack=null,combat=false}=input;
  // Fatal and reactions always have priority over attacks. Gameplay, not
  // the animation controller, determines whether an action is interrupted.
  if(dead){transition('Death',.04);hero.update(dt);return {state,priority:'death'};}
  if(hit){transition('Hit',.04);hero.update(dt);return {state,priority:'hit'};}
  if(dodge){transition('Dodge',.07);hero.update(dt);return {state,priority:'dodge'};}
  if(working){transition('Woodcut',.15);hero.update(dt);return {state,priority:'work'};}
  if(attack&&finite(t)){
   const id=String(attack.id??family+':'+abilityId);
   const sample=hero.sampleAbility(family,abilityId,attack,t);
   if(sample){
    state=sample.clip;actionId=id;
    return {state,priority:'attack',sample};
   }
  }
  const next=selectSkeletalLocomotion(input);
  if(state!==next){transition(next);hero.update(dt);}
  else hero.update(dt);
  return {state,priority:'locomotion'};
 }
 function equipFamily(family){
  const equipment=weaponFamily[family];
  if(!equipment)throw Error('Unknown weapon family: '+family);
  if(hero.equipped!==equipment)hero.equip(equipment);
  return equipment;
 }
 return {tick,equipFamily,selectSkeletalLocomotion,
  get state(){return state;},get lastActionId(){return actionId;},
  get failures(){return failed;}};
}
