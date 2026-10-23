/** Starter wearable equipment, mounted on existing animated Oakrest actor joints.
 * Shared basic meshes and materials remain owned by this module across loadouts.
 * Armour slot graphics are cosmetic; stats and item ownership still live in rules.
 */
import * as THREE from 'three';
import {HUMANOID_SHAPES as shapes} from './humanoid-shapes.js';
import {loadKayKit,cloneKayKitModel} from './model-assets.js';

const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,9,7);
const sharedMaterials=new Map();
function mat(colour){
 if(!sharedMaterials.has(colour))sharedMaterials.set(colour,new THREE.MeshStandardMaterial({color:colour,roughness:.76,metalness:.13,flatShading:true}));
 return sharedMaterials.get(colour);
}
function mesh(parent,geo,colour,position,scale){
 const m=new THREE.Mesh(geo,mat(colour));m.position.set(...position);m.scale.set(...scale);
 m.castShadow=false;parent.add(m);return m;
}
function group(u,parent){
 const g=new THREE.Group();parent.add(g);u.visibleEquipmentNodes.push(g);return g;
}
export function applyVisibleEquipment(actor,chest,slots={},style='melee'){
 const u=actor?.userData;if(!u?.rig||!u?.head)return;
 for(const g of u.visibleEquipmentNodes||[])g.removeFromParent();
 u.visibleEquipmentNodes=[];u.equipmentShield=false;
 const metal=style==='melee'?'#9caeb3':style==='magic'?'#7f94ba':'#8d7c5b';
 const fabric=style==='magic'?'#5a6c98':style==='ranged'?'#716048':'#646c64';
 const plating=chest==='plate'||chest==='starter-mail';
 const leather=chest==='leather'||chest==='starter-leather';
 const robe=chest==='starter-robes';
 u.chestPlate.visible=plating;u.leather.visible=leather;
 u.pauldrons.forEach(part=>part.visible=plating);
 if(u.foundation){u.chestPlate.material=mat(metal);u.pauldrons.forEach(part=>part.material=mat(metal));}
 u.cape.visible=!plating&&!leather;
 if(robe){
  const torso=group(u,u.upperBody||u.rig);
  mesh(torso,box,fabric,[0,1.48,-.32],[.70,.70,.07]);
  mesh(torso,box,'#9eacbf',[0,1.47,-.367],[.08,.53,.025]);
  mesh(torso,box,fabric,[0,.88,-.15],[.72,.56,.5]);
 }
 if(slots.helm){
  const helmet=group(u,u.head);
  if(style==='melee'){
   mesh(helmet,sphere,metal,[0,.17,.02],[.305,.265,.30]);
   mesh(helmet,box,'#d4c8a7',[0,-.04,-.286],[.10,.36,.05]);
   mesh(helmet,box,metal,[0,-.17,-.16],[.48,.095,.18]);
  }else{
   mesh(helmet,sphere,fabric,[0,.15,.04],[.34,.30,.32]);
   mesh(helmet,box,fabric,[0,-.02,-.28],[.58,.18,.12]);
  }
  u.hair.visible=false;u.hairBack.visible=false;u.hairTail.visible=false;
  u.hairCurls.forEach(x=>x.visible=false);
 }else u.hair.visible=true;
 if(slots.legs)for(const leg of [u.leftLeg,u.rightLeg]){
  const g=group(u,leg);
  if(u.foundation)mesh(g,shapes.thighArmour,style==='melee'?metal:fabric,[0,0,0],[1,1,1]);
  else {mesh(g,box,style==='melee'?metal:fabric,[0,-.24,-.15],[.27,.39,.17]);mesh(g,box,'#403f35',[0,-.43,-.17],[.30,.11,.21]);}
 }
 if(slots.boots)for(const [knee,ankle] of [[u.leftKnee,u.leftAnkle],[u.rightKnee,u.rightAnkle]]){
  const g=group(u,knee);
  if(u.foundation){mesh(g,shapes.greave,style==='melee'?metal:'#5a493a',[0,0,0],[1,1,1]);mesh(group(u,ankle),shapes.shoe,'#363931',[0,.397,0],[1.04,1,1.04]);}
  else {mesh(g,box,style==='melee'?metal:'#5a493a',[0,-.27,-.11],[.27,.30,.32]);mesh(g,box,'#363931',[0,-.42,-.21],[.32,.14,.43]);}
 }
 if(slots.amulet){
  const g=group(u,u.upperBody||u.rig);
  mesh(g,box,'#c6af75',[0,1.73,-.35],[.25,.035,.04]);
  const pendant=mesh(g,sphere,style==='magic'?'#88d8ec':'#c9b780',[0,1.60,-.385],[.095,.11,.055]);
  pendant.rotation.z=Math.PI/4;
 }
 if(slots.ring){
  const g=group(u,u.rightElbow);
  mesh(g,box,'#c7a96e',[0,-.315,-.125],[.16,.055,.19]);
 }
 if(slots.arrows&&style==='ranged'){
  const g=group(u,u.upperBody||u.rig);g.position.set(.36,1.35,.33);g.rotation.z=-.20;
  mesh(g,box,'#795b3e',[0,0,0],[.22,.63,.24]);
  for(let i=0;i<3;i++)mesh(g,box,'#e5d4a5',[-.065+i*.065,.44,0],[.027,.31,.025]);
  if(typeof window!=='undefined')loadKayKit('quiver').then(template=>{
   if(!template||!g.parent)return;
   g.clear();const model=cloneKayKitModel(template,.79);model.position.y-=.30;g.add(model);
  });
 }
 if(slots.offhand){
  const g=group(u,u.offhand);
  if(style==='melee'){
   u.equipmentShield=true;
   mesh(g,box,'#80694d',[0,-.15,-.20],[.56,.65,.14]);
   mesh(g,box,'#b6c0b0',[0,-.15,-.293],[.13,.57,.04]);
   if(typeof window!=='undefined')loadKayKit('shield_square').then(template=>{
    if(!template||!g.parent)return;
    g.clear();const model=cloneKayKitModel(template,.86);model.position.y-=.40;
    model.rotation.x=-Math.PI/2;g.add(model);
   });
  }else if(style==='magic'){
   mesh(g,sphere,'#92c9df',[0,-.08,-.18],[.18,.18,.18]);
   mesh(g,box,'#9f8f65',[0,-.24,-.18],[.27,.09,.27]);
  }
 }
}
