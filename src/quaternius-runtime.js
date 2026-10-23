/**
 * Small, shared, locally-hosted Quaternius renderer. Source meshes and atlases
 * are immutable cache entries. Original Oakrest gameplay/collision remain owner.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkin} from 'three/addons/utils/SkeletonUtils.js';
import {MODEL_BY_ID} from './quaternius-catalog.js';

const loader=new GLTFLoader();
const base=new URL('../assets/quaternius/',import.meta.url);
const cached=new Map();
function urlFor(id){
 if(!Object.hasOwn(MODEL_BY_ID,id))throw Error('Unknown Quaternius model '+id);
 return new URL('models/'+MODEL_BY_ID[id].file,base).href;
}
export function loadQuaternius(id){
 if(!cached.has(id))cached.set(id,loader.loadAsync(urlFor(id)).catch(err=>{
  console.warn('Oakrest art fallback for '+id,err);
  return null;
 }));
 return cached.get(id);
}
export function cloneFitted(template,height,origin='ground'){
 const copy=cloneSkin(template.scene),bounds=new THREE.Box3().setFromObject(copy);
 const size=new THREE.Vector3(),centre=new THREE.Vector3();
 bounds.getSize(size);bounds.getCenter(centre);
 if(!Number.isFinite(size.y)||size.y<.08||size.y>60)throw Error('Invalid sourced model bounds');
 const unit=height/size.y;
 copy.scale.setScalar(unit);
 copy.position.set(-centre.x*unit,-bounds.min.y*unit,-centre.z*unit);
 if(origin==='center')copy.position.y=-centre.y*unit;
 copy.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 return copy;
}
function clipMatch(clip,root){
 // Third party UAL tracks may use a different root node; do not animate
 // silently with incompatible skeleton names.
 let hits=0;
 for(const track of clip.tracks||[]){
  const bone=track.name.split('.')[0];
  if(root.getObjectByName(bone))hits++;
  if(hits>=3)return true;
 }
 return false;
}
function actionFor(template,clips,root,kind){
 const aliases=kind==='walk'?/walk|walking|locomotion/i:
   kind==='run'?/run|running|jog/i:
   kind==='attack'?/attack|strike|slash/i:/idle|breath|relax/i;
 return [...template.animations||[],...clips].find(c=>aliases.test(c.name)&&clipMatch(c,root))||null;
}
export async function mountQuaterniusModel(parent,id,height=2.4,{keepOriginals=[],onSuccess=null}={}){
 if(!parent||!Object.hasOwn(MODEL_BY_ID,id))return false;
 const token=Symbol();
 parent.userData.quaterniusStamp=token;
 const old=parent.userData.quaterniusMount;
 if(old){unmountQuaterniusModel(parent);}
 // unmount invalidates the current request stamp, so assign after teardown
 parent.userData.quaterniusStamp=token;
 const [gltf,library]=await Promise.all([loadQuaternius(id),id.includes('peasant')||id.includes('ranger')?loadQuaternius('universal-animations'):Promise.resolve(null)]);
 if(!gltf||parent.userData.quaterniusStamp!==token)return false;
 let copy;
 try{
  copy=cloneFitted(gltf,height);
  copy.rotation.y=Math.PI; // engine forward convention
  const mixer=new THREE.AnimationMixer(copy),actions={};
  for(const kind of ['idle','walk','run','attack']){
   const clip=actionFor(gltf,library?.animations||[],copy,kind);
   if(clip)actions[kind]=mixer.clipAction(clip);
  }
  // Never hide the functioning old animated model if the new skinned humanoid
  // cannot execute at least one genuine compatible animation.
  if((id.includes('peasant')||id.includes('ranger'))&&!actions.idle&&!actions.walk)
   throw Error('Missing compatible civilian/hero animation clips');
  const original=new Map();
  const preserve=new Set(keepOriginals);
  for(const node of [...parent.children]){
   if(node===copy||preserve.has(node))continue;
   original.set(node,node.visible);node.visible=false;
  }
  parent.add(copy);
  parent.userData.quaterniusMount={id,copy,mixer,actions,active:null,original,status:'ready',clip:null};
  onSuccess?.(parent);
  return true;
 }catch(err){
  copy?.removeFromParent();
  console.warn('Oakrest kept procedural model',id,err);
  return false;
 }
}
export function unmountQuaterniusModel(parent){
 if(!parent)return;
 parent.userData.quaterniusStamp=Symbol();
 const info=parent.userData.quaterniusMount;
 if(!info)return;
 for(const [node,visible] of info.original)node.visible=visible;
 info.mixer.stopAllAction();info.copy.removeFromParent();
 // Geometry and textures are intentionally shared cache assets. Never dispose.
 parent.userData.quaterniusMount=null;
}
export function updateQuaterniusModel(parent,dt,{moving=false,running=false,attacking=false,dead=false}={}){
 const info=parent?.userData?.quaterniusMount;
 if(!info)return;
 const kind=attacking?'attack':running?'run':moving?'walk':'idle';
 const action=info.actions[kind]||info.actions[moving?'walk':'idle']||Object.values(info.actions)[0];
 if(!action){info.copy.rotation.z=Math.sin((parent.userData.quaterniusCosmeticTime=(parent.userData.quaterniusCosmeticTime||0)+dt)*4)*(moving?.04:.015);return;}
 if(action!==info.active){
  info.active?.fadeOut(.16);
  action.reset().setLoop(dead?THREE.LoopOnce:THREE.LoopRepeat,Infinity).fadeIn(.16).play();
  info.active=action;info.clip=action.getClip().name;
 }
 info.mixer.update(Math.max(0,Math.min(.08,dt||0)));
}
export function quaterniusState(parent){
 const info=parent?.userData?.quaterniusMount;
 return {status:info?'ready':'original',model:info?.id||null,clip:info?.clip||null};
}
export function loadVillagePiece(filename){
 // Three will fetch the matching .bin and retained base-colour PNGs locally.
 if(!/^[a-z0-9_]+\.gltf$/i.test(filename))return Promise.resolve(null);
 const key='village/'+filename;
 if(!cached.has(key))cached.set(key,loader.loadAsync(new URL(key,base).href).catch(err=>{
  console.warn('Oakrest medieval facade fallback',filename,err);return null;
 }));
 return cached.get(key);
}
export function quaterniusCachedCount(){return cached.size;}
