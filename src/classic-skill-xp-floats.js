import * as THREE from 'three';

/** Deliberately excludes Melee, Ranged, Magic and Health. The combat XP
 * event is never interpreted as a skilling event by this presenter. */
export const SKILL_XP_NAMES=Object.freeze({
 woodcutting:'Woodcutting',mining:'Mining',foraging:'Foraging',
 blacksmithing:'Blacksmithing',fletching:'Fletching',
 inscription:'Inscription',cooking:'Fieldcraft'
});
const LIFE_SECONDS=1.35;
const MAX_FLOATS=5;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function skillXpLabel(event){
 if(event?.type!=='skill-xp'||!Object.hasOwn(SKILL_XP_NAMES,event.skill))return null;
 const amount=Number(event.amount);
 if(!Number.isSafeInteger(amount)||amount<=0)return null;
 return '+'+amount.toLocaleString('en-GB')+' '+SKILL_XP_NAMES[event.skill]+' XP';
}

/** Floating DOM text follows the actual projected character position; no
 * textures, extra draw calls, polling or new save fields are introduced. */
export function createClassicSkillXpFloats(root,{reducedMotion=false}={}){
 const doc=root.ownerDocument;
 const layer=doc.createElement('div');
 layer.className='classic-skill-xp-layer';
 layer.setAttribute('aria-hidden','true');
 root.append(layer);
 const floats=[];
 const projected=new THREE.Vector3();
 let nextIndex=0;
 function clear(){
  for(const item of floats)item.element.remove();
  floats.length=0;
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
 return {push,update,active:()=>floats.length,clear,dispose:()=>{clear();layer.remove();}};
}
