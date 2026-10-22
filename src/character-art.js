/** Self-hosted, optional KayKit *visual* bodies. The Oakrest procedural joints
 * remain gameplay/weapon/contact authority. No changes to physics or save data.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CHARACTER_ART,characterClipKind} from './character-asset-catalog.js';
const loader=new GLTFLoader();
const rootUrl=new URL('../assets/kaykit-character-art/',import.meta.url);
const playback=['idle','walk','run','attack','hit','dodge','death'];

function clipFor(clips,kind,family='sword'){
 const patterns={
  idle:[/\bidle[_\s-]*a?\b/i,/idle/i],
  walk:[/walking[_\s-]*a?\b/i,/walk/i],
  run:[/running[_\s-]*a?\b/i,/run/i],
  attack:family==='frost'||family==='ember'?[/(spell|cast|magic)/i,/attack/i]:
   family==='bow'||family==='shortbow'||family==='crossbow'?[/((bow|crossbow).*?(shoot|fire|attack)|ranged.*?attack)/i,/attack/i]:
   [/(melee.*?attack|attack.*?melee|attack|slash|strike)/i],
  hit:[/(hit|hurt|damage)/i],
  dodge:[/(dodge|roll)/i],
  death:[/(death|die|dying)/i]
 };
 for(const pattern of patterns[kind]||[]) {
  const hit=clips.find(c=>pattern.test(c.name));
  if(hit)return hit;
 }
 return null;
}
function under(node,parent){for(let p=node;p;p=p.parent)if(p===parent)return true;return false;}
function originalBodyParts(actor){
 const u=actor.userData, excluded=[u.weapon,u.offhand,...u.visibleEquipmentNodes||[]];
 const parts=[];
 u.rig?.traverse(o=>{
  if(o.isMesh&&!excluded.some(p=>p&&under(o,p)))parts.push(o);
 });
 return parts;
}
function hideOriginalBody(actor,hide){
 const u=actor.userData,art=u.kaykitCharacter;
 if(!art)return;
 if(hide){
  for(const part of originalBodyParts(actor)){
   if(!art.original.has(part))art.original.set(part,part.visible);
   part.visible=false;
  }
 }else{
  for(const [part,visible] of art.original)part.visible=visible;
  art.original.clear();
 }
}
function teardown(actor){
 const u=actor.userData,art=u.kaykitCharacter;
 if(!art)return;
 hideOriginalBody(actor,false);
 art.mixer?.stopAllAction();
 art.scene?.removeFromParent();
 // GLB resources are local to each loader instance, not shared with the Oakrest rig.
 art.scene?.traverse(o=>{
  o.geometry?.dispose?.();
  const materials=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
  for(const material of materials){
   for(const value of Object.values(material))if(value?.isTexture)value.dispose();
   material.dispose();
  }
 });
 u.kaykitCharacter=null;
}
export function characterArtState(actor){
 const a=actor?.userData?.kaykitCharacter;
 return {status:a?.status||'original',model:a?.key||null,clip:a?.clip||null};
}
/** Idempotent & race-safe even across fast character selection/style changes. */
export async function setCharacterArt(actor,key){
 if(!actor?.userData?.rig)return false;
 const u=actor.userData;
 if(key!==null&&!Object.hasOwn(CHARACTER_ART,key))return false;
 if(u.kaykitCharacter?.key===key&&u.kaykitCharacter?.status!=='failed')return true;
 const token=u.kaykitArtRequest=(u.kaykitArtRequest||0)+1;
 teardown(actor);
 if(key===null)return true;
 const art={key,status:'loading',original:new Map(),scene:null,mixer:null,actions:new Map(),clip:null,lastAttack:-Infinity};
 u.kaykitCharacter=art;
 try{
  const model=await loader.loadAsync(new URL(CHARACTER_ART[key].file,rootUrl).href);
  if(u.kaykitArtRequest!==token||u.kaykitCharacter!==art){
   model.scene.traverse(o=>o.geometry?.dispose?.());return false;
  }
  const scene=model.scene;
  const bounds=new THREE.Box3().setFromObject(scene);
  const size=new THREE.Vector3(),centre=new THREE.Vector3();
  bounds.getSize(size);bounds.getCenter(centre);
  if(!Number.isFinite(size.y)||size.y<.1||size.y>40)throw Error('KayKit body bounds invalid');
  const height=key==='skeleton'?2.43:2.51,scale=height/size.y;
  scene.scale.setScalar(scale);
  scene.position.set(-centre.x*scale,-bounds.min.y*scale,-centre.z*scale);
  // KayKit scene body faces forward; the engine's character forward is -Z.
  scene.rotation.y=Math.PI;
  scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;}});
  actor.add(scene);
  art.scene=scene;art.mixer=new THREE.AnimationMixer(scene);
  for(const kind of playback){
   const clip=clipFor(model.animations||[],kind,u.family);
   if(clip)art.actions.set(kind,art.mixer.clipAction(clip));
  }
  if(!art.actions.get('idle')&&!art.actions.get('walk'))throw Error('No KayKit locomotion clips');
  art.status='ready';
  hideOriginalBody(actor,true);
  console.info('Oakrest KayKit character ready',key,model.animations?.length||0,'clips');
  return true;
 }catch(err){
  if(u.kaykitCharacter===art){
   teardown(actor);u.kaykitCharacter={key,status:'failed',original:new Map(),clip:null};
   console.warn('Oakrest retained procedural body after KayKit load failure',key,err);
  }
  return false;
 }
}
/** Restore the original body before the existing equipment pipeline changes gear. */
export function beforeCharacterEquipment(actor){
 const art=actor?.userData?.kaykitCharacter;
 if(art?.status==='ready')hideOriginalBody(actor,false);
}
export function afterCharacterEquipment(actor){
 const art=actor?.userData?.kaykitCharacter;
 if(art?.status==='ready')hideOriginalBody(actor,true);
}
export function animateCharacterArt(actor,params){
 const art=actor?.userData?.kaykitCharacter;
 if(art?.status!=='ready')return;
 // The built-in procedural rig still drives swing origins and combat timestamps.
 const kind=characterClipKind(params);
 let action=art.actions.get(kind);
 if(!action)action=art.actions.get(kind==='run'?'walk':'idle');
 if(!action){beforeCharacterEquipment(actor);return;}
 const attackStamp=params.attack?.start??params.chopping?.start??-Infinity;
 const restart=kind==='attack'&&attackStamp!==art.lastAttack;
 if(kind==='attack')art.lastAttack=attackStamp;
 if(art.current!==action||restart){
  if(art.current&&art.current!==action)art.current.fadeOut(.10);
  action.reset().enabled=true;
  action.setLoop(['attack','hit','dodge','death'].includes(kind)?THREE.LoopOnce:THREE.LoopRepeat,Infinity);
  action.clampWhenFinished=true;
  action.fadeIn(.10).play();
  art.current=action;art.clip=action.getClip().name;
  if(kind==='attack'&&params.attack?.impactAt>attackStamp){
   // Cosmetic rate mapping only. Damage/contacts are still from combat rules.
   const wind=Math.max(.09,params.attack.impactAt-attackStamp);
   action.timeScale=Math.min(2.5,Math.max(.7,action.getClip().duration*.42/wind));
  }else action.timeScale=1;
 }
 art.mixer.update(Math.min(.1,Math.max(0,params.dt||0)));
}
