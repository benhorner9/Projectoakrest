/** Proximity-budgeted, local CC0 KayKit town NPC skins.
 * Root positions, routes, talk radius, bank/shop actions and collision all
 * remain governed by town-life. Shared skinned geometry is NEVER disposed.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {CHARACTER_ART} from './character-asset-catalog.js';
import {citizenModel,chooseDetailedCitizens,CITIZEN_ART_LIMIT} from './town-citizen-art-rules.js';

const loader=new GLTFLoader();
const baseUrl=new URL('../assets/kaykit-character-art/',import.meta.url);
const promises=new Map(),failed=new Set();
function sharedModel(key){
 if(failed.has(key))return Promise.resolve(null);
 if(!promises.has(key))promises.set(key,loader.loadAsync(new URL(CHARACTER_ART[key].file,baseUrl).href)
  .then(gltf=>({scene:gltf.scene,clips:gltf.animations||[]}))
  .catch(err=>{failed.add(key);console.warn('Procedural town NPC fallback:',key,err);return null;}));
 return promises.get(key);
}
const findClip=(clips,re)=>clips.find(clip=>re.test(clip.name))||null;
function makeVisual(npc,key,source){
 const clone=cloneSkinned(source.scene);
 const bounds=new THREE.Box3().setFromObject(clone);
 const size=new THREE.Vector3(),center=new THREE.Vector3();
 bounds.getSize(size);bounds.getCenter(center);
 if(!Number.isFinite(size.y)||size.y<.1||size.y>40)throw Error('KayKit citizen invalid GLB bounds');
 const scale=2.42/size.y;
 clone.scale.setScalar(scale);
 clone.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 clone.rotation.y=Math.PI;
 clone.name='Oakrest licensed villager body: '+npc.name;
 const ownedMaterials=[];
 clone.traverse(obj=>{
  if(!obj.isMesh)return;
  // Clone material, not geometry or textures. Keep CC0 atlas GPU-cached.
  const materialCopy=original=>{
   const m=original.clone();
   if(m.color)m.color.lerp(new THREE.Color(npc.colour||'#80958a'),.13);
   ownedMaterials.push(m);
   return m;
  };
  obj.material=Array.isArray(obj.material)?obj.material.map(materialCopy):materialCopy(obj.material);
  obj.castShadow=false;
  obj.receiveShadow=false;
 });
 const mixer=new THREE.AnimationMixer(clone),actions={};
 for(const [kind,pattern] of [['idle',/idle/i],['walk',/walk/i]]){
  const clip=findClip(source.clips,pattern);
  if(clip)actions[kind]=mixer.clipAction(clip);
 }
 if(!actions.idle&&!actions.walk)throw Error('KayKit town citizen has no idle/walk clips');
 const fallback=npc.root.userData.oakrestProceduralCitizenParts||[];
 npc.root.add(clone);
 for(const part of fallback)part.visible=false;
 return {npc,key,clone,mixer,actions,current:null,ownedMaterials,kind:null};
}
function removeVisual(art){
 art.mixer.stopAllAction();
 art.clone.removeFromParent();
 // The GLB's shared bones, geometry and texture atlases belong to the cache.
 for(const m of art.ownedMaterials)m.dispose();
 for(const part of art.npc.root.userData.oakrestProceduralCitizenParts||[])part.visible=true;
}
export function createTownCitizenArt(citizens){
 let enabled=false;
 const mounted=new Map(),pending=new Map();
 let epoch=0,elapsed=0;
 function clear(){
  epoch++;
  for(const art of mounted.values())removeVisual(art);
  mounted.clear();pending.clear();
 }
 function setEnabled(value){
  if(enabled===!!value)return;
  enabled=!!value;
  if(!enabled)clear();
 }
 function update(dt,t,player){
  if(!enabled||!player)return;
  elapsed+=dt;
  if(elapsed>.4){
   elapsed=0;
   const candidates=chooseDetailedCitizens(citizens,player,new Set(mounted.keys()),CITIZEN_ART_LIMIT);
   const wanted=new Set(candidates);
   for(const [npc,art] of mounted)if(!wanted.has(npc)){
    removeVisual(art);mounted.delete(npc);
   }
   for(const npc of candidates){
    if(mounted.has(npc)||pending.has(npc))continue;
    const key=citizenModel(npc.role,citizens.indexOf(npc)),token=epoch;
    pending.set(npc,token);
    sharedModel(key).then(source=>{
     if(pending.get(npc)!==token)return;
     pending.delete(npc);
     if(!source||!enabled||epoch!==token)return;
     // Re-check distance/cap since async completion can reorder sources.
     if(Math.hypot(npc.x-player.x,npc.z-player.z)>31||mounted.size>=CITIZEN_ART_LIMIT)return;
     try{mounted.set(npc,makeVisual(npc,key,source));}
     catch(err){console.warn('Town citizen body fallback',npc.name,err);}
    });
   }
  }
  for(const art of mounted.values()){
   const kind=art.npc.walking?'walk':'idle';
   const action=art.actions[kind]||art.actions.idle||art.actions.walk;
   if(action!==art.current){
    art.current?.fadeOut(.15);
    action.reset().fadeIn(.15).play();
    art.current=action;art.kind=kind;
   }
   art.mixer.update(Math.max(0,Math.min(.07,dt)));
  }
 }
 function snapshot(){
  return {enabled,loaded:mounted.size,pending:pending.size,max:CITIZEN_ART_LIMIT,
   models:[...new Set([...mounted.values()].map(art=>art.key))],
   citizens:[...mounted.values()].map(art=>({name:art.npc.name,role:art.npc.role,model:art.key,clip:art.current?.getClip().name||null}))};
 }
 return {setEnabled,update,snapshot};
}
