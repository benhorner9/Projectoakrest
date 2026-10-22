/** Lazy boundary: a missing WebGL add-on or CC0 model must NEVER block Oakrest boot. */
let runtime=null,loading=null;
const pending=new WeakMap();
function loadRuntime(){
 if(!loading)loading=import('./character-art.js').then(mod=>(runtime=mod)).catch(err=>{
  console.warn('Oakrest KayKit art unavailable; procedural actors remain playable',err);
  return null;
 });
 return loading;
}
export function requestCharacterArt(actor,key){
 if(!actor?.userData?.rig)return;
 const token=Symbol();pending.set(actor,token);
 if(!key&&!runtime)return;
 loadRuntime().then(mod=>{
  if(mod&&pending.get(actor)===token)mod.setCharacterArt(actor,key);
 });
}
export function beforeActorEquipment(actor){runtime?.beforeCharacterEquipment(actor);}
export function afterActorEquipment(actor){runtime?.afterCharacterEquipment(actor);}
export function updateActorArt(actor,params){runtime?.animateCharacterArt(actor,params);}
export function mountedArtState(actor){return runtime?.characterArtState(actor)||{status:'original',model:null,clip:null};}
