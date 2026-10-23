/** Exact Quaternius Ultimate RPG Pack OBJ/MTL assets from the original author.
 * One model identity across inventory, bank, ground loot and held gear.
 * Fail-open to existing KayKit/procedural art on any loader error.
 */
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {rpgModelName} from './quaternius-rpg-catalog.js';
const base=new URL('../assets/quaternius/rpg/',import.meta.url);
const promises=new Map();
export function loadQuaterniusRpg(modelName){
 const file=rpgModelName(modelName);
 if(!file)return Promise.resolve(null);
 if(!promises.has(file))promises.set(file,(async()=>{
  const [obj,mtl]=await Promise.all([fetch(new URL(file+'.obj',base)),fetch(new URL(file+'.mtl',base))]);
  if(!obj.ok||!mtl.ok)throw Error('Missing official Quaternius RPG '+file+' '+obj.status+'/'+mtl.status);
  const materials=new MTLLoader().parse(await mtl.text(),base.href);
  materials.preload();
  const asset=new OBJLoader().setMaterials(materials).parse(await obj.text());
  let triangles=0;
  asset.traverse(child=>{
   if(child.isMesh){
    const geo=child.geometry;triangles+=geo?.getAttribute('position')?.count/3||0;
    child.castShadow=false;child.receiveShadow=false;
    if(Array.isArray(child.material))child.material.forEach(m=>{m.side=THREE.DoubleSide;});
    else if(child.material)child.material.side=THREE.DoubleSide;
   }
  });
  if(!triangles||triangles>100000)throw Error('Unexpected RPG mesh topology '+file);
  return asset;
 })().catch(error=>{console.warn('Oakrest kept original item art',file,error);return null;}));
 return promises.get(file);
}
export {rpgModelName};
