/** Add genuine Quaternius Ultimate Monsters over existing spatial enemy AI. */
import {monsterModel} from './quaternius-catalog.js';
let runtime=null,promise=null;
const requests=new WeakMap();
function getRuntime(){
 if(!promise)promise=import('./quaternius-runtime.js').then(mod=>runtime=mod).catch(err=>{
  console.warn('Original Oakrest creatures retained',err);return null;
 });
 return promise;
}
export function setQuaterniusMonster(enemy,enabled){
 const key=enabled&&enemy?monsterModel(enemy.type):null;
 if(!enemy?.group)return;
 const stamp=Symbol();requests.set(enemy.group,stamp);
 if(!key){
  runtime?.unmountQuaterniusModel(enemy.group);return;
 }
 getRuntime().then(mod=>{
  if(!mod||requests.get(enemy.group)!==stamp)return;
  // The HP plate/target UI remains at the exact original world height.
  const keep=enemy.plate?[enemy.plate]:[];
  mod.mountQuaterniusModel(enemy.group,key,1.65,{keepOriginals:keep})
   .then(ok=>{if(ok&&requests.get(enemy.group)!==stamp)mod.unmountQuaterniusModel(enemy.group);});
 });
}
export function updateQuaterniusMonster(enemy,dt){
 runtime?.updateQuaterniusModel(enemy.group,dt,{
  moving:enemy.aggro||enemy.retreating,running:enemy.charge!==null,
  attacking:enemy.warning!==null,dead:enemy.dead
 });
}
export function inspectQuaterniusMonster(enemy){
 return runtime?.quaterniusState(enemy?.group)||{status:'original',model:null};
}
