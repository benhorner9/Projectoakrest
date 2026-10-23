/**
 * Oakrest main character uses Universal Base Characters with the Fantasy
 * Modular Outfits set. Gameplay bones and combat events remain owned by the
 * existing procedural rig, which keeps weapon/shield pivots and hit accuracy.
 * Render old *body meshes* invisible only once both sourced meshes and
 * compatible movement clips are ready. Everything restores on any failure.
 */
import * as THREE from 'three';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {loadQuaternius,quaterniusCachedCount} from './quaternius-runtime.js';
import {playerOutfit} from './quaternius-catalog.js';
const clips={idle:/idle|relax|breath/i,walk:/walk/i,run:/run|jog/i,attack:/attack|slash|strike/i};
function compatible(clip,model){
 let matched=0;
 for(const track of clip.tracks){
  const path=track.name.split('.')[0];
  if(model.getObjectByName(path))matched++;
  if(matched>2)return true;
 }
 return false;
}
function makePart(source,scale,originalMinY){
 const part=cloneSkinned(source.scene),bounds=new THREE.Box3().setFromObject(part);
 const centre=new THREE.Vector3(),size=new THREE.Vector3();
 bounds.getCenter(centre);bounds.getSize(size);
 if(size.y<.1||size.y>50)throw Error('Unusable universal character model bounds');
 part.scale.setScalar(scale);
 part.position.set(-centre.x*scale,-originalMinY*scale,-centre.z*scale);
 part.rotation.y=Math.PI;
 part.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 return part;
}
export function createQuaterniusHeroArt(hero){
 const rig=hero.userData?.rig;
 if(!rig)throw Error('Oakrest hero rig unavailable');
 let enabled=false,serial=0,current=null,look={sex:'male',style:'melee'},phase='original';
 let bodyOriginals=new Map();
 function isUnder(object,ancestor){
  for(let node=object;node;node=node.parent)if(node===ancestor)return true;
  return false;
 }
 function concealBody(){
  const weapon=hero.userData.weapon,offhand=hero.userData.offhand;
  rig.traverse(node=>{
   if(!node.isMesh||isUnder(node,weapon)||isUnder(node,offhand))return;
   if(!bodyOriginals.has(node))bodyOriginals.set(node,node.visible);
   node.visible=false;
  });
 }
 function revealBody(){
  for(const [node,visible] of bodyOriginals)node.visible=visible;
  bodyOriginals.clear();
 }
 function destroy(){
  serial++;
  if(current){
   current.parts.forEach(p=>p.mixer.stopAllAction());
   current.container.removeFromParent();
   current=null;
  }
  revealBody();phase='original';
 }
 async function refresh(){
  destroy();
  if(!enabled)return;
  const stamp=++serial;
  const sex=look.sex==='female'?'female':'male';
  const outfit=playerOutfit({sex,style:look.style});
  phase='loading';
  const [base,clothes,library]=await Promise.all([
   loadQuaternius('base-'+sex),loadQuaternius(outfit),loadQuaternius('universal-animations')
  ]);
  if(stamp!==serial||!enabled)return;
  if(!base||!clothes||!library){phase='fallback';return;}
  let container;
  try{
   const bounds=new THREE.Box3().setFromObject(base.scene),boxSize=new THREE.Vector3();
   bounds.getSize(boxSize);
   if(boxSize.y<.1)throw Error('Unusable universal base body');
   const scale=2.35/boxSize.y;
   container=new THREE.Group();container.name='Quaternius universal hero + fantasy outfit';
   const parts=[];
   for(const source of [base,clothes]){
    const model=makePart(source,scale,bounds.min.y);
    container.add(model);
    const mixer=new THREE.AnimationMixer(model),actions={};
    const animations=[...(source.animations||[]),...(library.animations||[])];
    for(const [kind,re] of Object.entries(clips)){
     const clip=animations.find(c=>re.test(c.name)&&compatible(c,model));
     if(clip)actions[kind]=mixer.clipAction(clip);
    }
    if(!actions.idle&&!actions.walk)throw Error('Universal avatar missing compatible animation');
    parts.push({model,mixer,actions,active:null});
   }
   hero.add(container);
   if(stamp!==serial){container.removeFromParent();return;}
   current={container,parts,sex,outfit};
   concealBody();
   phase='ready';
  }catch(err){
   container?.removeFromParent();
   phase='fallback';
   console.warn('Oakrest original hero preserved',err);
  }
 }
 function configure(on,profile,style){
  const next={sex:profile?.sex==='female'?'female':'male',style};
  const changed=look.sex!==next.sex||look.style!==next.style;
  const toggle=enabled!==!!on;enabled=!!on;look=next;
  if(toggle||changed)void refresh();
 }
 function update(dt,{moving=false,running=false,attacking=false,dead=false}={}){
  if(!current)return;
  // Existing weapon pivots can change after a hot equipment swap.
  concealBody();
  const target=attacking?'attack':running?'run':moving?'walk':'idle';
  for(const part of current.parts){
   const next=part.actions[target]||part.actions[moving?'walk':'idle']||Object.values(part.actions)[0];
   if(!next)continue;
   if(part.active!==next){
    part.active?.fadeOut(.12);
    next.reset().setLoop(dead?THREE.LoopOnce:THREE.LoopRepeat,Infinity).fadeIn(.12).play();
    part.active=next;
   }
   part.mixer.update(Math.min(.08,Math.max(0,dt)));
  }
 }
 return {configure,update,reset:destroy,snapshot:()=>({
  enabled,status:phase,source:'Quaternius CC0',base:current?'base-'+current.sex:null,
  outfit:current?.outfit||null,parts:current?.parts.length||0,cached:quaterniusCachedCount()
 })};
}
