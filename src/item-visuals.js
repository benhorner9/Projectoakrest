/** Physical loot art for Classic and the item catalogue.
 * Geometry-only, deterministic and derived from actual canonical item IDs.
 * Classic opts out of async legacy models to avoid texture/pop-in on iPad.
 */
import * as THREE from 'three';
import {itemFromDrop,itemIconUrl,getItem} from './items.js';
import {classicItemArtProfile} from './classic-item-art.js';
import {upgradeGroundItem} from './model-assets.js';
const cube=new THREE.BoxGeometry(1,1,1);
const part=(root,geometry,mat,x,y,z,sx=1,sy=1,sz=1)=>{
 const obj=new THREE.Mesh(geometry===cube?cube.clone():geometry,mat);
 obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.castShadow=false;obj.receiveShadow=false;
 root.add(obj);return obj;
};
const block=(root,mat,x,y,z,w,h,d)=>part(root,cube,mat,x,y,z,w,h,d);
const gem=(root,mat,x,y,z,size=.26)=>part(root,new THREE.OctahedronGeometry(size,0),mat,x,y,z);
const facet=(root,mat,x,y,z,w,h,d)=>part(root,new THREE.IcosahedronGeometry(1,0),mat,x,y,z,w,h,d);
export function makeWorldItemModel(drop,{classic=false}={}){
 const item=itemFromDrop(drop);if(!item)return null;
 const visual=classicItemArtProfile(item),kind=visual.shape;
 const root=new THREE.Group();root.name='oakrest-ground-'+visual.shape+'-'+item.id;
 root.userData.itemId=item.id;root.userData.visualShape=kind;root.userData.classicOnly=classic;
 const matte=(hex,metal=0)=>new THREE.MeshLambertMaterial({color:hex,flatShading:true});
 const main=matte(visual.base),light=matte(visual.glint),dark=matte(visual.shade);
 const wood=matte('#76583e'),parchment=matte('#e7d5ad');
 const prisma=(x,y,z,w,h,d,mat=main)=>block(root,mat,x,y,z,w,h,d);
 if(kind==='coins'){
  for(let i=0;i<3;i++){
   const disc=part(root,new THREE.CylinderGeometry(.23,.23,.10,9),i===2?light:main,(i-1)*.19,.10+i*.07,0);
   disc.rotation.x=Math.PI/2;
  }
 }else if(kind==='logs'){
  for(const i of [-1,0,1]){
   const x=i*.22;
   const log=part(root,new THREE.CylinderGeometry(.16,.18,.68,7),main,x,.22+Math.abs(i)*.05,0);
   log.rotation.x=Math.PI/2;
   const end=part(root,new THREE.CylinderGeometry(.135,.135,.028,7),light,x,.22+Math.abs(i)*.05,.36);
   end.rotation.x=Math.PI/2;
   block(root,dark,x,.22,.26,.10,.015,.12);
  }
 }else if(kind==='ore'||kind==='crystal'||kind==='heart'||kind==='ingot'){
  if(kind==='ingot'){
   prisma(0,.25,0,.70,.23,.42,dark);prisma(0,.37,0,.58,.06,.32,light);
   prisma(0,.39,.04,.19,.035,.19,main);
  }else{
   const count=kind==='ore'?3:kind==='heart'?4:2;
   for(let i=0;i<count;i++){
    const x=(i-(count-1)/2)*.29;
    const mineral=gem(root,i%2?main:dark,x,.36+(i%2)*.12,(i%2)*.10,kind==='heart'?.21:.26);
    mineral.scale.y=kind==='heart'?1.2:1.45;
    gem(root,light,x,.46+(i%2)*.12,.025,.08);
   }
  }
 }else if(kind==='herbs'||kind==='fibre'){
  for(let i=0;i<4;i++){
   const x=(i-1.5)*.17;
   const stem=part(root,new THREE.ConeGeometry(.14,.65,5),i%2?light:main,x,.34+i%2*.08,0);
   stem.rotation.z=(i-1.5)*.18;
  }
 }else if(kind==='hide'){
  const skin=part(root,new THREE.CylinderGeometry(.43,.38,.075,7),main,0,.24,0,1,.65,1);
  skin.rotation.z=.17;prisma(0,.25,.12,.56,.055,.12,light);
  prisma(0,.22,-.17,.48,.045,.09,dark);
 }else if(kind==='ration'){
  prisma(0,.26,0,.55,.35,.39,main);
  prisma(0,.47,0,.65,.08,.45,parchment);
  prisma(0,.32,.22,.35,.07,.055,dark);
 }else if(kind==='potion'){
  part(root,new THREE.CylinderGeometry(.20,.26,.55,8),main,0,.40,0);
  prisma(0,.73,0,.19,.20,.20,wood);prisma(0,.84,0,.29,.07,.29,parchment);
  gem(root,light,.08,.44,.22,.09);
 }else if(kind==='scroll'||kind==='seal'){
  if(kind==='seal'){
   part(root,new THREE.CylinderGeometry(.32,.32,.15,8),main,0,.35,0);
   gem(root,light,0,.49,0,.17);
  }else{
   prisma(0,.19,0,.72,.08,.47,parchment);
   for(const x of [-.35,.35]){
    const roll=part(root,new THREE.CylinderGeometry(.08,.08,.53,8),wood,x,.20,0);
    roll.rotation.x=Math.PI/2;
   }
   prisma(0,.29,.07,.26,.035,.12,main);
  }
 }else if(kind==='chest'){
  prisma(0,.45,0,.54,.60,.35,dark);
  prisma(0,.50,.19,.43,.43,.045,main);
  prisma(0,.61,.22,.13,.27,.032,light);
  for(const x of [-.37,.37])prisma(x,.60,0,.22,.22,.31,main);
 }else if(kind==='helm'){
  facet(root,dark,0,.48,0,.40,.32,.35);
  prisma(0,.70,.01,.44,.08,.35,main);
  prisma(0,.42,.30,.20,.26,.05,light);
 }else if(kind==='legs'){
  prisma(0,.69,0,.62,.18,.28,light);
  for(const x of [-.18,.18])prisma(x,.35,0,.22,.55,.27,main);
 }else if(kind==='boots'){
  for(const x of [-.22,.22]){
   prisma(x,.32,0,.25,.46,.29,main);
   prisma(x,.12,.16,.31,.16,.52,dark);
   prisma(x,.44,.16,.20,.05,.12,light);
  }
 }else if(kind==='shield'){
  const shield=facet(root,dark,0,.50,0,.47,.54,.15);
  shield.rotation.z=Math.PI/4;
  prisma(0,.52,.14,.14,.62,.08,main);
  prisma(0,.51,.20,.30,.09,.045,light);
 }else if(kind==='amulet'||kind==='ring'){
  const torus=part(root,new THREE.TorusGeometry(kind==='ring'?.26:.32,.065,5,10),light,0,.45,0);
  torus.rotation.x=0;
  gem(root,main,0,kind==='ring'?.68:.22,.1,.17);
 }else if(kind==='orb'){
  gem(root,main,0,.57,0,.39);
  gem(root,light,0,.68,.14,.16);
  prisma(0,.19,0,.46,.13,.46,dark);
 }else if(kind==='arrows'){
  prisma(0,.22,0,.40,.32,.32,dark);
  for(const i of [-1,0,1]){
   prisma(i*.14,.58,0,.065,.57,.065,wood);
   gem(root,i===0?light:main,i*.14,.89,0,.10);
  }
 }else if(['bow','crossbow'].includes(kind)){
  if(kind==='crossbow'){
   prisma(0,.54,0,.14,.94,.14,wood);
   prisma(0,.82,0,.69,.14,.15,main);
   prisma(0,.82,.11,.67,.035,.05,light);
  }else{
   for(let i=0;i<7;i++){
    const t=i/6*Math.PI;
    const limb=prisma(Math.sin(t)*.34,.18+i*.12,0,.09,.18,.085,wood);
    limb.rotation.z=Math.cos(t)*.35;
   }
   prisma(0,.54,.02,.028,.86,.026,light);
  }
 }else if(kind==='staff'||kind==='wand'){
  const length=kind==='wand'?.73:1.12;
  const staff=part(root,new THREE.CylinderGeometry(.06,.08,length,7),wood,0,.45+(length-1)*.16,0);
  staff.rotation.z=.26;
  gem(root,main,-.14,.50+length*.54,0,kind==='wand'?.17:.25);
  gem(root,light,-.14,.53+length*.54,.08,.08);
 }else if(['axe','daggers','sword','greatsword'].includes(kind)){
  if(kind==='axe'){
   const handle=prisma(-.07,.50,0,.10,.90,.11,wood);handle.rotation.z=-.18;
   prisma(.13,.89,0,.48,.31,.16,dark);
   prisma(.25,.93,.04,.20,.21,.11,light);
  }else if(kind==='daggers'){
   for(const x of [-.19,.19]){
    prisma(x,.55,0,.11,.51,.08,main);
    prisma(x,.84,.05,.045,.34,.045,light);
    prisma(x,.28,0,.23,.07,.14,wood);
    prisma(x,.16,0,.085,.17,.11,dark);
   }
  }else{
   const great=kind==='greatsword';
   prisma(0,.54,0,great?.22:.15,great?.94:.70,.10,main);
   prisma(0,great?.81:.73,.06,.055,great?.45:.32,.04,light);
   prisma(0,.24,0,great?.54:.39,.07,.15,wood);
   prisma(0,.12,0,.105,.20,.11,dark);
   gem(root,light,0,.24,.08,.07);
  }
 }else{
  prisma(0,.35,0,.55,.45,.35,main);gem(root,light,0,.72,0,.16);
 }
 // A small facet is a landmark, not a rarity beacon. Does not affect picking.
 const rune=gem(root,light,.25,.76,.15,.09);
 rune.userData.decorativeOnly=true;
 root.rotation.y=(visual.seed%13)*.12;
 if(!classic)upgradeGroundItem(root,item.id);
 return root;
}
export function makeInventoryIcon(itemId,cssClass='item-icon'){
 const item=getItem(itemId);if(!item)return null;
 const img=document.createElement('img');img.className=cssClass;img.src=itemIconUrl(item.id);
 img.alt='';img.loading='lazy';img.decoding='async';img.width=36;img.height=36;
 return img;
}
