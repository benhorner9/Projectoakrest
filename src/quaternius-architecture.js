/** Non-colliding Quaternius architecture over original enterable Oakrest rooms.
 * Never replace town footprints, walls, openings, doors, interior floors or
 * roof cutaway authority. Restore every original mesh on art fallback.
 */
import * as THREE from 'three';
import {loadVillagePiece} from './quaternius-runtime.js';
const rooffile='Roof_RoundTiles_4x6.gltf';
const doorfile='DoorFrame_Round_Brick.gltf';
const windowfile='Wall_Plaster_Window_Wide_Round.gltf';

function fit(scene,width,height,depth){
 const clone=scene.clone(true);
 const bounds=new THREE.Box3().setFromObject(clone),size=new THREE.Vector3(),centre=new THREE.Vector3();
 bounds.getSize(size);bounds.getCenter(centre);
 if(Math.min(size.x,size.y,size.z)<.005)throw Error('Invalid medieval piece dimensions');
 const sx=width/size.x,sy=height/size.y,sz=depth/size.z;
 clone.scale.set(sx,sy,sz);
 clone.position.set(-centre.x*sx,-bounds.min.y*sy,-centre.z*sz);
 clone.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 return clone;
}
export function createMedievalVillageArt(buildings){
 let enabled=false,generation=0;
 const applied=new Map();
 async function applyBuilding(entry,token){
  const {build,root,roof,cutaway,height}=entry;
  const [roofSource,doorSource,windowSource]=await Promise.all([
   loadVillagePiece(rooffile),loadVillagePiece(doorfile),loadVillagePiece(windowfile)
  ]);
  if(token!==generation||!enabled)return;
  const mounts=[],oldRoof=[...roof.children],newCutaway=[];
  try{
   if(roofSource){
    const replacement=fit(roofSource.scene,build.w+1.04,
     build.kind==='trade'?2.30:1.82,build.d+1.02);
    replacement.position.y=height-.12;
    for(const child of oldRoof)child.visible=false;
    roof.add(replacement);mounts.push(replacement);
   }
   if(doorSource){
    const frame=fit(doorSource.scene,3.15,3.14,.55);
    frame.position.set(0,0,build.d/2+.27);
    root.add(frame);mounts.push(frame);
    cutaway.front.push(frame);newCutaway.push(frame);
   }
   if(windowSource){
    const count=build.w>9?2:1;
    for(let i=0;i<count;i++){
     const panel=fit(windowSource.scene,Math.min(2.55,build.w*.25),Math.min(3.12,height*.64),.36);
     panel.position.set(count===1?build.w*.27:(i===0?-1:1)*build.w*.31,1,build.d/2+.23);
     root.add(panel);mounts.push(panel);
     cutaway.front.push(panel);newCutaway.push(panel);
    }
   }
   applied.set(entry,{mounts,oldRoof,newCutaway});
  }catch(err){
   console.warn('Original Oakrest structure retained',build.id,err);
   for(const obj of mounts)obj.removeFromParent();
   for(const obj of oldRoof)obj.visible=true;
   cutaway.front=cutaway.front.filter(x=>!newCutaway.includes(x));
  }
 }
 function clear(){
  generation++;
  for(const [entry,record] of applied){
   for(const node of record.mounts)node.removeFromParent();
   for(const old of record.oldRoof)old.visible=true;
   entry.cutaway.front=entry.cutaway.front.filter(x=>!record.newCutaway.includes(x));
  }
  applied.clear();
 }
 function setEnabled(on){
  if(enabled===!!on)return;
  enabled=!!on;
  if(!enabled){clear();return;}
  const token=++generation;
  for(const entry of buildings)void applyBuilding(entry,token);
 }
 return {setEnabled,snapshot:()=>({enabled,buildings:applied.size,expected:buildings.length})};
}
