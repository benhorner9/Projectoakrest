/** Authored, in-place skeletal clips for the existing Oakrest ability catalogue.
 * This is visual presentation only. Authoritative movement, hit checks, projectile
 * origins, cooldowns and release event dispatch remain with the game simulation.
 */
import * as THREE from 'three';
import {listAnimationSpecs} from './ability-animation.js';
import {abilityMotion} from './animation-language.js';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const CATALOGUE=Object.freeze(listAnimationSpecs().map(spec=>Object.freeze({
 id:spec.weaponFamily+':'+spec.abilityId,
 family:spec.weaponFamily,abilityId:spec.abilityId,
 style:spec.style,name:spec.abilityName,cue:spec.motionCue,
 instant:spec.instant,kind:spec.kind||'basic',
 anticipation:spec.anticipation.seconds,recovery:spec.recovery.seconds,
 event:spec.event
})));
const CATALOGUE_MAP=new Map(CATALOGUE.map(spec=>[spec.id,spec]));
export const skeletalAbilityName=(family,id)=>'Ability/'+family+':'+id;
export const skeletalAbilityCatalogue=()=>CATALOGUE.slice();
export const skeletalAbilitySpec=(family,id)=>CATALOGUE_MAP.get(family+':'+id)||null;

// Each stage is a full pose for 16+ bones. All angles are radians.
// This uses the individual combat cue's authored vector, plus distinct
// family stances, foot bracing, elbow bending and hand/finger gestures.
function pose(spec,wind=0,release=0,settle=0,phase=0){
 const {family,cue,kind}=spec;
 const bow=family==='bow'||family==='shortbow',crossbow=family==='crossbow';
 const heavy=family==='greatsword',daggers=family==='daggers';
 const caster=family==='frost'||family==='ember';
 const barrier=['parry','barrier','shield'].includes(cue)||kind==='shield';
 const heal=cue==='heal'||kind==='heal';
 const movement=['rush','charge','blink','retreat','roll','recoilstep'].includes(cue)
   ||kind==='dash'||kind==='dashback';
 const rush=cue==='rush'||cue==='charge'||cue==='blink'||kind==='dash';
 const roll=cue==='roll'||cue==='recoilstep'||kind==='dashback';
 const aoe=['nova','wave','scatter','cleave'].includes(cue);
 const two=heavy||family==='frost';
 const m=abilityMotion(family,cue,wind,release);
 const a=clamp(wind+release),eff=clamp(wind+release+settle*.3);
 // Generic basic attacks still swing/draw decisively, not just wiggle a wrist.
 const basic=spec.abilityId==='basic';
 const basicStrength=basic?(heavy?1.3:daggers?.70:.85):0;
 const baseRaise=bow?.88:crossbow?.52:caster?.22:two?.12:.10;
 const basicRight=basicStrength*(-.8*wind+.76*release);
 const basicLeft=basicStrength*(two?-.55*wind+.65*release:daggers?.35*release:bow?.28*wind:0);
 const backstep=movement?(rush?-.38:.38)*a:0;
 const mirror=daggers&&cue==='cross'?-1:1;
 const right=[
  baseRaise+basicRight-m.right*.78+(barrier?-.62*a:0)+(heal?.48*a:0),
  (caster?-.09:0)+m.twist*.23+(bow?-.55*a:0),
  (daggers?-.14:two?.18:.11)+m.right*.18+(barrier?.35*a:0)
 ];
 const left=[
  (bow?.80:crossbow?.50:two?.20:.08)+basicLeft-m.left*.78+
    (barrier?-.64*a:0)+(heal?.55*a:0)+(aoe?-.14*a:0),
  (bow?.2:0)-m.twist*.23,
  (two?-.14:-.10)-m.left*.19-(barrier?.35*a:0)
 ];
 const torso=[m.lean*.42+(movement?backstep*.28:0),m.twist*.67,daggers?m.twist*.11:0];
 const hips=[(movement?backstep*.34:0)+(heavy?.09*wind:0),-m.twist*.18,0];
 const recoil=crossbow?-.25*release:0;
 const guard=barrier?.58:0;
 const curl=clamp(.46*wind+.30*release+(barrier?.12:0));
 const leg=movement?.64*a:(heavy?.20*wind:daggers?.16*release:.09*a);
 return {
  Hips:hips,Spine:[torso[0]*.33,torso[1]*.45,-m.twist*.08],
  Chest:[torso[0],torso[1],torso[2]+recoil],
  Neck:[-m.head*.12,-m.twist*.17,0],
  Head:[m.head*.26+(heal?-.16*a:0),-m.twist*.30,0],
  RightShoulder:[.04*a,m.twist*.12,m.right*.07],
  LeftShoulder:[.04*a,-m.twist*.12,m.left*.07],
  RightUpperArm:right,LeftUpperArm:left,
  RightLowerArm:[-.18-m.elbow*.42-(bow?.36*a:0)+(barrier?.35*a:0),0,.06*wind],
  LeftLowerArm:[-.12-(two?.24*a:0)-(heal?.35*a:0)-guard*.25,0,-.06*wind],
  RightHand:[m.elbow*.16+(caster?.28*release:0),m.twist*.18,m.right*.12],
  LeftHand:[(bow?-.30:heal?-.40:0)*a,-m.twist*.18,-m.left*.12],
  RightThumb:[0,.15*curl,0],RightIndex:[.20*curl,0,0],
  LeftThumb:[0,-.15*curl,0],LeftIndex:[.20*curl,0,0],
  RightUpperLeg:[movement?-leg*.70:leg*.38,0,(roll?-.23*wind:0)],
  LeftUpperLeg:[movement?leg*.55:-leg*.38,0,(roll?.23*wind:0)],
  RightLowerLeg:[movement?Math.abs(leg)*.38:.12*wind,0,0],
  LeftLowerLeg:[movement?Math.abs(leg)*.45:.10*wind,0,0],
  RightFoot:[movement?-.21*a:0,0,0],LeftFoot:[movement?.21*a:0,0,0],
  RightToe:[.15*release,0,0],LeftToe:[.13*release,0,0]
 };
}
function clipSchedule(spec){
 const pre=spec.instant?0:Math.max(.001,spec.anticipation);
 const duration=Math.max(.43,pre+.31,spec.recovery);
 if(spec.instant)return {
  impact:0,duration,
  rows:[[0,0,1,0,0],[duration*.16,0,.75,0,.16],
   [duration*.42,0,.30,.55,.42],[duration,0,0,0,1]]
 };
 const remain=duration-pre;
 const rows=[
  [0,0,0,0,0],
  [pre*.43,.70,0,0,.2],
  [pre*.84,1,0,0,.5],
  [pre,0,1,0,.65],
  [pre+remain*.34,0,.65,.18,.8],
  [pre+remain*.72,0,.22,.60,.92],
  [duration,0,0,0,1]
 ];
 // Rapid shot adds visible repeated bowstring pulling *after* the first real
 // release; no fictional extra projectile or damage event is emitted.
 if(spec.cue==='rapid'){
  const ix=4;
  rows.splice(ix,0,[pre+remain*.18,.4,.10,0,.7]);
  rows.splice(ix+2,0,[pre+remain*.53,.35,.16,0,.86]);
 }
 return {impact:pre,duration,rows};
}
function rotation(values){
 return new THREE.Quaternion().setFromEuler(new THREE.Euler(...values,'XYZ')).toArray();
}
export function createSkeletalAbilityClip(spec){
 if(!spec||!spec.family||!spec.abilityId)throw Error('Missing skeletal ability specification');
 const {impact,duration,rows}=clipSchedule(spec);
 const steps=rows.map(([t,wind,release,settle,phase])=>({t,pose:pose(spec,wind,release,settle,phase)}));
 const names=Object.keys(steps[0].pose);
 const tracks=names.map(bone=>{
  const values=steps.flatMap(step=>rotation(step.pose[bone]));
  return new THREE.QuaternionKeyframeTrack(bone+'.quaternion',steps.map(step=>step.t),values);
 });
 const clip=new THREE.AnimationClip(skeletalAbilityName(spec.family,spec.abilityId),duration,tracks);
 clip.userData={skeletalAbility:spec.id,impact,instant:spec.instant,event:spec.event,
  source:'Oakrest-authored-skeleton',visualOnly:true};
 return clip;
}
let cached;
export function buildSkeletalAbilityClips(){
 if(!cached)cached=CATALOGUE.map(createSkeletalAbilityClip);
 return cached.slice();
}
/** Piecewise mapping pins visual impact exactly to real gameplay impact time.
 * Instant actions have their effect at action start. Never dispatches it.
 */
export function sampleSkeletalAbilityTime(spec,attack,now){
 if(!spec||!attack||![attack.start,attack.impactAt,attack.interval,now].every(Number.isFinite))return null;
 const end=attack.start+attack.interval;
 if(!(attack.interval>0)||now<attack.start||now>=end)return null;
 const {impact,duration}=clipSchedule(spec);
 const trigger=spec.instant?attack.start:clamp(attack.impactAt,attack.start,end);
 const before=now<trigger;
 const time=before
  ?impact*clamp((now-attack.start)/Math.max(.000001,trigger-attack.start))
  :impact+(duration-impact)*clamp((now-trigger)/Math.max(.000001,end-trigger));
 return {clip:skeletalAbilityName(spec.family,spec.abilityId),time:Math.min(duration-.00001,time),
  impact,phase:before?'anticipation':spec.instant&&now===attack.start?'instant':'recovery',
  contact:now>=trigger,sourceEvent:spec.event,visualOnly:true};
}
