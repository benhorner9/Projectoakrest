/** Local CC0 KayKit Adventurers accessory loader. No CDN, build-time services or save changes.
 * These small, single-mesh glTF 2.0 accessories are loaded on demand and their
 * geometry/materials are cached; clones MUST NOT dispose shared GPU resources.
 */
import * as THREE from 'three';

import {MODEL_NAMES,modelNameForItem} from './item-model-registry.js';
export {MODEL_NAMES,modelNameForItem} from './item-model-registry.js';
const models=new Set(MODEL_NAMES);
const base=new URL('../assets/kaykit-adventurers/',import.meta.url);
const loaded=new Map();
const typeMap={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const componentCounts={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
function attribute(doc,buffers,id){
 const accessor=doc.accessors[id],view=doc.bufferViews[accessor.bufferView];
 const count=componentCounts[accessor.type],ctor=typeMap[accessor.componentType];
 if(!count||!ctor||view.byteStride||accessor.sparse)throw Error('Unsupported KayKit accessor');
 const offset=(view.byteOffset||0)+(accessor.byteOffset||0),len=accessor.count*count*ctor.BYTES_PER_ELEMENT;
 const bytes=buffers[view.buffer].slice(offset,offset+len);
 if(bytes.byteLength!==len)throw Error('Truncated KayKit mesh');
 return {array:new ctor(bytes),count,normalized:accessor.normalized===true};
}
async function loadRaw(name){
 const url=new URL(name+'.gltf',base);
 const response=await fetch(url);
 if(!response.ok)throw Error('KayKit model '+name+': HTTP '+response.status);
 const doc=await response.json();
 const buffers=await Promise.all(doc.buffers.map(async b=>{
  const res=await fetch(new URL(b.uri,url));
  if(!res.ok)throw Error('KayKit geometry missing: '+b.uri);
  return res.arrayBuffer();
 }));
 const textures=await Promise.all((doc.images||[]).map(async img=>{
  if(!/^[\w.-]+\.png$/i.test(img.uri||''))throw Error('Unexpected texture path');
  return new Promise((resolve,reject)=>{
   new THREE.TextureLoader().load(new URL(img.uri,url).href,t=>{
    t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;resolve(t);
   },undefined,reject);
  });
 }));
 const result=new THREE.Group();
 for(const meshDef of doc.meshes||[]){
  for(const prim of meshDef.primitives||[]){
   const geo=new THREE.BufferGeometry();
   for(const [key,attr] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'})){
    if(prim.attributes?.[key]===undefined)continue;
    const data=attribute(doc,buffers,prim.attributes[key]);
    geo.setAttribute(attr,new THREE.BufferAttribute(data.array,data.count,data.normalized));
   }
   if(prim.indices!==undefined)geo.setIndex(new THREE.BufferAttribute(attribute(doc,buffers,prim.indices).array,1));
   if(!geo.getAttribute('normal'))geo.computeVertexNormals();
   const materialDef=doc.materials?.[prim.material];
   const textureIndex=materialDef?.pbrMetallicRoughness?.baseColorTexture?.index;
   const sourceIndex=doc.textures?.[textureIndex]?.source;
   const material=new THREE.MeshStandardMaterial({
    map:sourceIndex===undefined?null:textures[sourceIndex],
    color:'#ffffff',metalness:0,roughness:.8,side:THREE.DoubleSide,
   });
   const obj=new THREE.Mesh(geo,material);
   obj.castShadow=false;obj.receiveShadow=false;obj.userData.sharedKayKitAsset=true;
   result.add(obj);
  }
 }
 if(!result.children.length)throw Error('No KayKit mesh: '+name);
 return result;
}
export function loadKayKit(name){
 if(!models.has(name))return Promise.resolve(null);
 if(!loaded.has(name))loaded.set(name,loadRaw(name).catch(error=>{
  console.warn('Oakrest item asset fallback:',name,error);
  return null;
 }));
 return loaded.get(name);
}
function sizedModel(template,size){
 const instance=template.clone(true),bounds=new THREE.Box3().setFromObject(instance);
 const ext=new THREE.Vector3(),center=new THREE.Vector3();
 bounds.getSize(ext);bounds.getCenter(center);
 const unit=size/Math.max(.001,ext.x,ext.y,ext.z);
 instance.scale.setScalar(unit);
 // Retain the original upright source orientation until parent alignment.
 instance.position.set(-center.x*unit,-bounds.min.y*unit,-center.z*unit);
 return instance;
}
/** Asynchronous replacement of the procedural fallback, safe if loot was picked up. */
export function upgradeGroundItem(root,itemId){
 if(typeof window==='undefined')return;
 const name=modelNameForItem(itemId);if(!name)return;
 const stamp=Symbol();root.userData.assetStamp=stamp;
 loadKayKit(name).then(template=>{
  if(!template||root.userData.destroyed||root.userData.assetStamp!==stamp)return;
  const laid=new THREE.Group(),copy=sizedModel(template,
   name==='quiver'?.7:name==='shield_square'?.8:1.05);
  laid.add(copy);
  laid.rotation.x=-Math.PI/2;
  laid.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(laid);
  laid.position.y=-.49-bounds.min.y;
  for(const child of root.children)child.visible=false;
  root.add(laid);root.userData.assetLoaded=name;
 });
}
/** Keep combat rig's live tells (crystal/bowstring/crossbow catch) when swapping the static prop.
 * Meshes are shared and cached; never dispose loaded accessory geometry on re-equip.
 */
export function upgradeHeldWeapon(hero,style,weaponId){
 if(typeof window==='undefined')return;
 const hand=hero.userData?.weapon;if(!hand)return;
 const stamp=Symbol();hand.userData.assetStamp=stamp;
 const name=modelNameForItem('weapon.'+style+'.'+weaponId);
 if(!name)return;
 loadKayKit(name).then(template=>{
  if(!template||hand.userData.assetStamp!==stamp||hero.userData.weapon!==hand)return;
  // Hide only the procedural base art, retaining animated live components and
  // the original motion rig for true in-world combat telegraphs.
  const live=new Set([hero.userData.crossbowSlider,hero.userData.magicFocus]);
  const hideStatic=parent=>parent.traverse(obj=>{
   if(obj.isMesh&&!live.has(obj))obj.visible=false;
  });
  hideStatic(hand);
  if(name==='dagger'&&!hero.userData.equipmentShield){
   // Keep attached equipped shields and focus visible; hide only old dagger art.
   const worn=new Set(hero.userData.visibleEquipmentNodes||[]);
   for(const child of hero.userData.offhand.children)if(!worn.has(child))hideStatic(child);
  }
  const holder=new THREE.Group(),height=name==='sword_2handed'?1.95:
   name==='staff'?1.85:name==='wand'?.92:name==='dagger'?.74:
   name==='crossbow_2handed'?1.2:1.48;
  const model=sizedModel(template,height);
  model.position.y-=height*.23;holder.add(model);holder.rotation.x=-Math.PI/2;
  hand.add(holder);hand.userData.assetLoaded=name;
  if(name==='dagger'&&!hero.userData.equipmentShield){
   const other=new THREE.Group(),second=sizedModel(template,.74);
   second.position.y-=.74*.23;other.add(second);other.rotation.x=-Math.PI/2;
   hero.userData.offhand.add(other);
  }
 });
}
export const cloneKayKitModel=(template,height)=>sizedModel(template,height);
/** A different held item invalidates any outstanding async asset request. */
export function invalidateHeldWeapon(hero){
 const hand=hero?.userData?.weapon;
 if(hand)hand.userData.assetStamp=Symbol();
}
