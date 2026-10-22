/**
 * KayKit Character Animations Free 1.1 (Kay Lousberg, CC0-1.0) pose adapter.
 * Retargets a curated set of real Rig_Medium clip rotations onto Oakrest's
 * existing independent rigid-body pivots. Source curves: kaykit-clips.js.
 *
 * Keeps weapon hitboxes, action clocks, root movement, ammo, cooldowns and
 * projectile authority in the original simulation, never in this renderer.
 */
import * as THREE from 'three';
import {KAYKIT_BONES,KAYKIT_CLIPS} from './kaykit-clips.js';

const TARGETS={
 'upperarm.l':'leftArm','upperarm.r':'rightArm',
 'lowerarm.l':'leftElbow','lowerarm.r':'rightElbow',
 'upperleg.l':'leftLeg','upperleg.r':'rightLeg',
 'lowerleg.l':'leftKnee','lowerleg.r':'rightKnee',
 chest:'rig',head:'head'
};
const CLIP_KEYS=KAYKIT_BONES.map(b=>TARGETS[b]);
const before={
 sword:'Melee_1H_Attack_Slice_Horizontal',
 daggers:'Melee_Dualwield_Attack_Slice',
 greatsword:'Melee_2H_Attack_Chop',
 bow:'Ranged_Bow_Draw',shortbow:'Ranged_Bow_Draw',
 crossbow:'Ranged_2H_Aiming',
 frost:'Ranged_Magic_Spellcasting',ember:'Ranged_Magic_Spellcasting'
};
const after={
 bow:'Ranged_Bow_Release',shortbow:'Ranged_Bow_Release',
 crossbow:'Ranged_2H_Shoot',
 frost:'Ranged_Magic_Shoot',ember:'Ranged_Magic_Shoot'
};
const cues={
 overhand:'Melee_1H_Attack_Chop',cleave:'Melee_1H_Attack_Slice_Horizontal',
 break:'Melee_1H_Attack_Stab',parry:'Melee_Block',
 slice:'Melee_Dualwield_Attack_Slice',cross:'Melee_Dualwield_Attack_Chop',
 execute:'Melee_Dualwield_Attack_Stab',rush:'Dodge_Forward',
 pierce:'Ranged_Bow_Draw',rapid:'Ranged_Bow_Draw',pin:'Ranged_Bow_Draw',
 retreat:'Dodge_Backward',reload:'Ranged_2H_Reload',
 scatter:'Ranged_2H_Shoot',snare:'Ranged_2H_Aiming',recoilstep:'Dodge_Backward',
 cast:'Ranged_Magic_Spellcasting',flare:'Ranged_Magic_Shoot',
 wave:'Ranged_Magic_Spellcasting_Long',nova:'Ranged_Magic_Summon',
 bind:'Ranged_Magic_Summon',barrier:'Ranged_Magic_Raise',
 heal:'Ranged_Magic_Raise',arcane:'Ranged_Magic_Shoot',
 blink:'Dodge_Forward',roll:'Dodge_Backward',charge:'Dodge_Forward',
 focus:'Ranged_Bow_Aiming_Idle'
};
const heavy={overhand:'Melee_2H_Attack_Chop',cleave:'Melee_2H_Attack_Slice',break:'Melee_2H_Attack_Stab',parry:'Melee_Block'};
const scratchA=new THREE.Quaternion(),scratchB=new THREE.Quaternion(),scratchMix=new THREE.Quaternion();
const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
const mod=(a,b)=>((a%b)+b)%b;

export const KAYKIT_MOTION_SOURCE='KayKit Character Animations Free 1.1 — CC0';
export function kayKitClipFor(family,abilityKind=null,phase='windup'){
 if(abilityKind==='basic'||abilityKind==='')abilityKind=null;
 if(family==='greatsword'&&heavy[abilityKind])return heavy[abilityKind];
 if(phase==='release'&&after[family])return after[family];
 if(abilityKind&&cues[abilityKind])return cues[abilityKind];
 return before[family]||'Melee_1H_Attack_Slice_Horizontal';
}
export function kayKitClipNames(){return Object.keys(KAYKIT_CLIPS);}

function stateFor({t=0,stride=0,speed=0,attack=null,dodge=0,hit=false,dead=false,chopping=null},actorFamily=null){
 if(chopping)return null;
 if(dead)return {clip:'Death_A',phase:1,strength:1};
 if(hit)return {clip:'Hit_A',phase:.65,strength:.96};
 if(dodge>.035)return {clip:'Dodge_Forward',phase:clamp(1-dodge),strength:1};
 if(attack&&Number.isFinite(attack.start)&&Number.isFinite(attack.impactAt)){
  const start=attack.start,impact=Math.max(start,attack.impactAt),interval=Math.max(.1,attack.interval||.7);
  if(t>=start&&t<start+interval){
   const family=actorFamily||attack.family||'sword',kind=attack.abilityKind||null;
   const ranged=['bow','shortbow','crossbow','frost','ember'].includes(family);
   const windup=impact-start,afterTime=Math.max(.12,interval-windup);
   if(ranged){
    const isAfter=t>=impact;
    return {clip:kayKitClipFor(family,kind,isAfter?'release':'windup'),
     phase:isAfter?clamp((t-impact)/afterTime):clamp((t-start)/Math.max(.05,windup)),
     strength:1};
   }
   const progress=t<=impact?.62*clamp((t-start)/Math.max(.05,windup)):
    .62+.38*clamp((t-impact)/afterTime);
   return {clip:kayKitClipFor(family,kind),phase:progress,strength:1};
  }
 }
 if(speed>.35){
  const running=speed>2.5;
  return {clip:running?'Running_A':'Walking_A',phase:mod(stride/(Math.PI*2),1),strength:running?.95:.9};
 }
 // The first release did not play KayKit at idle at all. A character
 // standing in the village therefore looked EXACTLY like the old version.
 // Cycle the CC0 source idle clip, with a gentler upper-body influence.
 return {clip:'Idle_A',phase:mod(t/KAYKIT_CLIPS.Idle_A.seconds,1),strength:.55};
}
// Public pure decision helper makes ability/family compatibility testable.
export function kayKitMotionState(info){
 const state=stateFor(info);
 return state&&KAYKIT_CLIPS[state.clip]?state:null;
}

function ensureOffsets(u){
 if(!u.kaykitOffsets)u.kaykitOffsets=CLIP_KEYS.map(()=>new THREE.Quaternion());
 return u.kaykitOffsets;
}
/** Remove only the prior frame's additive KayKit motion before damped base poses. */
export function restoreKayKitPose(u){
 const offsets=u.kaykitOffsets;
 if(!offsets)return;
 for(let i=0;i<CLIP_KEYS.length;i++){
  const target=u[CLIP_KEYS[i]];
  if(!target)continue;
  target.quaternion.multiply(offsets[i].invert());
  offsets[i].identity();
 }
}
/** The caller must first run the normal procedural pose; no gameplay mutations. */
export function applyKayKitPose(u,info){
 if(u.kaykitDisabled){u.kaykitLastClip='';u.kaykitLastDegrees=0;return false;}
 const state=stateFor(info,u.family);
 if(!state||!KAYKIT_CLIPS[state.clip]){u.kaykitLastClip='';u.kaykitLastDegrees=0;return false;}
 const clip=KAYKIT_CLIPS[state.clip];
 const frames=clip.frames,index=clamp(state.phase)*(frames.length-1),lo=Math.floor(index),hi=Math.min(frames.length-1,lo+1),frac=index-lo;
 const first=frames[lo],last=frames[hi],offsets=ensureOffsets(u);
 u.kaykitLastClip=state.clip;u.kaykitLastDegrees=0;
 for(let i=0;i<CLIP_KEYS.length;i++){
  const target=u[CLIP_KEYS[i]];
  if(!target)continue;
  const p=i*4;
  scratchA.set(first[p],first[p+1],first[p+2],first[p+3]).normalize();
  scratchB.set(last[p],last[p+1],last[p+2],last[p+3]).normalize();
  scratchA.slerp(scratchB,frac);
  // KayKit-forward: the old integration only applied ~48% of an attack
  // shoulder curve (0.70 * 0.68) and skipped idle altogether, making the
  // commercial-use CC0 pack look unchanged from the gameplay camera.
  // Apply almost all of the licensed arm motion, leaving a bounded share
  // of leg/torso/head deltas for the rigid pivot rig, equipment attachments,
  // authored skill-specific tells and collision-independent root position.
  const groupWeight=i<2?.96:i<4?.86:i<8?.73:i===8?.46:.30;
  const weight=clamp(state.strength*groupWeight,0,1);
  scratchMix.identity().slerp(scratchA,weight);
  u.kaykitLastDegrees=Math.max(u.kaykitLastDegrees,Math.round(
   2*Math.acos(Math.min(1,Math.abs(scratchMix.w)))*180/Math.PI
  ));
  target.quaternion.multiply(scratchMix);
  offsets[i].copy(scratchMix);
 }
 return true;
}
