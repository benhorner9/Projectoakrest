import * as THREE from 'three';
import {WOODCUTTING_LEVEL_XP} from './woodcutting.js';

/** Deliberately excludes Melee, Ranged, Magic and Health. The combat XP
 * event is never interpreted as a skilling event by this presenter. */
export const SKILL_XP_NAMES=Object.freeze({
 woodcutting:'Woodcutting',mining:'Mining',foraging:'Foraging',
 blacksmithing:'Blacksmithing',fletching:'Fletching',
 inscription:'Inscription',cooking:'Fieldcraft'
});
const LIFE_SECONDS=1.35;
const BANNER_SECONDS=3.15;
export const SKILL_LEVEL_CAP=WOODCUTTING_LEVEL_XP.length-1;
const MAX_FLOATS=5;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function skillXpLabel(event){
 if(event?.type!=='skill-xp'||!Object.hasOwn(SKILL_XP_NAMES,event.skill))return null;
 const amount=Number(event.amount);
 if(!Number.isSafeInteger(amount)||amount<=0)return null;
 return '+'+amount.toLocaleString('en-GB')+' '+SKILL_XP_NAMES[event.skill]+' XP';
}

export function skillLevelUpLabel(event){
 if(event?.type!=='skill-level-up'||!Object.hasOwn(SKILL_XP_NAMES,event.skill))return null;
 const level=Number(event.level);
 if(!Number.isSafeInteger(level)||level<2||level>SKILL_LEVEL_CAP)return null;
 return SKILL_XP_NAMES[event.skill]+' '+level+'/'+SKILL_LEVEL_CAP;
}

/** Floating DOM text follows the actual projected character position; no
 * textures, extra draw calls, polling or new save fields are introduced. */
export function createClassicSkillXpFloats(root,{reducedMotion=false}={}){
 const doc=root.ownerDocument;
 const layer=doc.createElement('div');
 layer.className='classic-skill-xp-layer';
 layer.setAttribute('aria-hidden','true');
 root.append(layer);
 // This is a level-up banner only, not a permanent XP or combat HUD.
 const banner=doc.createElement('div');
 banner.className='classic-skill-level-banner';
 banner.hidden=true;banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
 const bannerTitle=doc.createElement('span');bannerTitle.textContent='SKILL LEVEL UP';
 const bannerValue=doc.createElement('strong');
 banner.append(bannerTitle,bannerValue);root.append(banner);
 let bannerStart=-Infinity;
 const floats=[];
 const projected=new THREE.Vector3();
 let nextIndex=0;
 function clear(){
  for(const item of floats)item.element.remove();
  floats.length=0;banner.hidden=true;bannerStart=-Infinity;bannerValue.textContent='';
 }
 function levelUp(event){
  const label=skillLevelUpLabel(event);
  if(!label||!Number.isFinite(event.time))return false;
  bannerValue.textContent=label;
  bannerStart=event.time;
  banner.hidden=false;
  banner.style.opacity='1';
  return true;
 }
 function push(event,position){
  const label=skillXpLabel(event);
  if(!label||!Number.isFinite(event.time)||!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return false;
  const element=doc.createElement('span');
  element.className='classic-skill-xp-float';
  element.textContent=label;
  layer.append(element);
  floats.push({element,x:position.x,z:position.z,start:event.time,index:nextIndex++});
  while(floats.length>MAX_FLOATS)floats.shift().element.remove();
  return true;
 }
 function update(camera,time){
  if(!banner.hidden){
   const age=time-bannerStart;
   if(age<0||age>=BANNER_SECONDS)banner.hidden=true;
   else banner.style.opacity=String(age>BANNER_SECONDS-.5?(BANNER_SECONDS-age)/.5:1);
  }
  const width=root.clientWidth,height=root.clientHeight;
  if(!width||!height)return;
  for(let i=floats.length-1;i>=0;i--){
   const item=floats[i],elapsed=time-item.start;
   if(elapsed>=LIFE_SECONDS||elapsed<0){
    item.element.remove();floats.splice(i,1);continue;
   }
   projected.set(item.x,2.9,item.z).project(camera);
   const visible=projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<1.04&&Math.abs(projected.y)<1.04;
   item.element.hidden=!visible;
   if(!visible)continue;
   const progress=clamp(elapsed/LIFE_SECONDS,0,1);
   const rise=reducedMotion?10:49;
   const offset=(item.index%3-1)*15;
   item.element.style.left=(projected.x*.5+.5)*width+offset+'px';
   item.element.style.top=(.5-projected.y*.5)*height-8-rise*progress+'px';
   item.element.style.opacity=String(progress<.6?1:Math.max(0,(1-progress)/.4));
  }
 }
 return {push,levelUp,update,active:()=>floats.length,levelState:()=>banner.hidden?null:bannerValue.textContent,
  clear,dispose:()=>{clear();layer.remove();banner.remove();}};
}
