/** Procedural, per-item world representations for persistent physical loot. */
import * as THREE from 'three';
import {itemFromDrop,itemIconUrl,getItem} from './items.js';
import {upgradeGroundItem} from './model-assets.js';
const box=new THREE.BoxGeometry(1,1,1);
function seed(id){let n=2166136261;for(const char of id)n=Math.imul(n^char.charCodeAt(0),16777619)>>>0;return n;}
const material=(hex,metalness=0)=>new THREE.MeshStandardMaterial({color:hex,roughness:.62,metalness});
const shape=(parent,geometry,mat,x,y,z,sx=1,sy=1,sz=1)=>{
 const piece=new THREE.Mesh(geometry===box?box.clone():geometry,mat);piece.position.set(x,y,z);piece.scale.set(sx,sy,sz);
 piece.castShadow=false;parent.add(piece);return piece;
};
export function makeWorldItemModel(drop){
 const item=itemFromDrop(drop);if(!item)return null;
 const root=new THREE.Group(),n=seed(item.id),main=material(item.accent,.16),light=material('#e8dfbd',.35),dark=material('#5c4839');
 const prism=(x,y,z,w,h,d,mat=main)=>shape(root,box,mat,x,y,z,w,h,d);
 if(item.shape==='coin'){
  for(let i=0;i<3;i++){const disc=shape(root,new THREE.CylinderGeometry(.27,.27,.10,10),main,(i-1)*.2,.06+i*.1,0);disc.rotation.x=Math.PI/2;}
 }else if(item.shape==='fibre'){
  for(let i=0;i<5;i++){const sprig=shape(root,new THREE.ConeGeometry(.16,.6,5),main,(i-2)*.115,.35+(i%2)*.1,(i%2)*.08);sprig.rotation.z=(i-2)*.22;}
 }else if(item.shape==='hide'){
  const hide=shape(root,new THREE.CylinderGeometry(.4,.4,.07,6),main,0,.17,0,1,.3,.9);
  hide.rotation.z=.25;prism(0,.14,.1,.6,.05,.10,light);
 }else if(item.shape==='token'){
  const medallion=shape(root,new THREE.CylinderGeometry(.33,.33,.14,6),main,0,.32,0);
  medallion.rotation.x=Math.PI/2;prism(0,.37,.09,.18,.22,.07,light);
 }else if(item.shape==='armour'){
  prism(0,.46,0,.65,.64,.31,main);
  prism(-.43,.59,0,.23,.27,.31,dark);prism(.43,.59,0,.23,.27,.31,dark);
  prism(0,.7,-.19,.22,.29,.08,light);
 }else if(item.shape==='blade'){
  prism(0,.58,0,.19,.81,.09,light);prism(0,.26,0,.44,.08,.14,dark);
  prism(0,.09,0,.09,.36,.12,main);
  prism(0,.96,0,.12,.18,.07,light);
 }else if(item.shape==='staff'){
  const staff=shape(root,new THREE.CylinderGeometry(.07,.075,1.15,8),dark,0,.61,0);
  staff.rotation.z=.31;
  const gem=shape(root,new THREE.OctahedronGeometry(.25),main,-.18,1.18,0);
  gem.rotation.y=.3;
 }else if(item.shape==='bow'){
  for(let i=0;i<8;i++){
   const t=i/7*Math.PI,ox=Math.sin(t)*.34;
   const limb=prism(ox,.12+i*.115,0,.1,.18,.08,dark);limb.rotation.z=Math.cos(t)*.37;
  }
  prism(0,.55,0,.035,.92,.035,light);
  prism(.18,.52,-.05,.34,.045,.06,main);
 }else if(item.shape==='orb'){
  shape(root,new THREE.OctahedronGeometry(.4),main,0,.6,0);prism(0,.2,0,.5,.12,.5,light);
 }else if(item.shape==='scroll'){
  prism(0,.28,0,.77,.11,.54,light);
  const end=shape(root,new THREE.CylinderGeometry(.09,.09,.82,9),dark,-.4,.28,0);end.rotation.z=Math.PI/2;
  prism(0,.37,.08,.45,.04,.13,main);
 }
 // Each item has a distinct coloured rune/stamp, even within the same equipment family.
 const rune=shape(root,new THREE.OctahedronGeometry(.09+(n%4)*.009,0),main,.3+(n%3)*.045,.83+(n%5)*.045,.13);
 rune.rotation.set((n%7)*.3,(n%5)*.24,0);
 root.rotation.y=(n%13)*.115;
 upgradeGroundItem(root,item.id);
 return root;
}
export function makeInventoryIcon(itemId,cssClass='item-icon'){
 const item=getItem(itemId);if(!item)return null;
 const img=document.createElement('img');img.className=cssClass;img.src=itemIconUrl(item.id);
 img.alt='';img.loading='lazy';img.decoding='async';img.width=36;img.height=36;
 return img;
}
