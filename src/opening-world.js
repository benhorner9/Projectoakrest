import * as THREE from 'three';
import {addWorldObstacle} from './terrain.js';

/**
 * Two isolated starter locations built from local geometry, so there is no
 * dependency on remote assets and no need to deploy an online world first.
 */
export const START_POINTS={
 tutorial:{x:0,z:11},
 realm:{x:0,z:11},
 world:{x:0,z:11}
};
const solid=(color,emissive)=>new THREE.MeshStandardMaterial({
 color,roughness:.83,metalness:.06,...(emissive?{emissive,emissiveIntensity:.45}:{})
});
const pieces=(root,geometry,material,x,y,z,scale=[1,1,1])=>{
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);
 mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
};
const box=new THREE.BoxGeometry(1,1,1),pillar=new THREE.CylinderGeometry(.34,.43,1,8);
function plinth(root,x,z,colour){
 const m=solid(colour);
 pieces(root,box,m,x,.28,z,[3,.56,2.4]);
 pieces(root,box,solid('#b3a78c'),x,.63,z,[2.65,.18,2.1]);
}
function portalArch(root,x,z,active,rotation=0){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;root.add(g);
 const stone=solid(active?'#a5b1a9':'#767e7d'),gold=solid('#b39a6f');
 for(const s of [-1,1]){
  pieces(g,box,stone,s*1.48,2,0,[.65,4,.72]);addWorldObstacle({x:x+s*1.48*Math.cos(rotation),z:z-s*1.48*Math.sin(rotation),r:.45,height:4.5,area:'realm'});
  pieces(g,new THREE.IcosahedronGeometry(.53,0),gold,s*1.48,4.12,0);
 }
 pieces(g,box,stone,0,4.02,0,[3.72,.64,.8]);
 const disc=new THREE.Mesh(new THREE.CircleGeometry(1.64,36),
  new THREE.MeshBasicMaterial({color:active?'#71d4db':'#626e78',side:THREE.DoubleSide,transparent:true,opacity:active?.65:.18,depthWrite:false}));
 disc.position.y=2.13;disc.position.z=.02;g.add(disc);
 const rune=new THREE.Mesh(new THREE.TorusGeometry(1.35,.075,6,42),
  new THREE.MeshBasicMaterial({color:active?'#b7fbef':'#817f8f',transparent:true,opacity:active?.92:.30}));
 rune.position.y=2.13;rune.position.z=.08;g.add(rune);
 return {disc,rune};
}
function floatingText(root,label,x,y,z){
 // A sign stays legible without relying on canvas text or loaded fonts.
 const board=pieces(root,box,solid('#263b3c'),x,y,z,[3.2,.57,.17]);
 board.rotation.y=0;
 return board;
}
export function createOpeningLocations(scene){
 const training=new THREE.Group(),realm=new THREE.Group();scene.add(training,realm);
 const meadow=solid('#728f67'),stone=solid('#88938a'),wood=solid('#846a4c');
 pieces(training,box,meadow,0,-.19,0,[55,.34,55]);
 for(let z=-17;z<=17;z+=1.8)pieces(training,box,solid('#ab9e7e'),0,.015,z,[3,.035,1.2]);
 for(const [x,z] of [[-9,-8],[9,-8],[-9,9],[9,9]]){
  plinth(training,x,z,'#8c9991');
  for(const offset of [-1,1]){pieces(training,pillar,stone,x+offset,1.4,z,[1,2.8,1]);addWorldObstacle({x:x+offset,z,r:.43,height:2.8,area:'tutorial'});}
 }
 const banner=pieces(training,box,wood,0,3.1,-12,[10,.35,.45]);
 for(const s of [-1,1])pieces(training,box,wood,s*4.8,1.6,-12,[.5,3.2,.5]);
 for(const x of [-13,13]){
  for(let z=-18;z<=18;z+=5){
   pieces(training,new THREE.ConeGeometry(1.8,4.3,6),solid('#466a52'),x,2.05,z);
   pieces(training,pillar,wood,x,.5,z,[.8,1,.8]);addWorldObstacle({x,z,r:.34,height:4.3,area:'tutorial'});
  }
 }
 const tutor=pieces(training,new THREE.ConeGeometry(.68,2.4,8),solid('#8972a0'),-5,1.26,2);
 pieces(training,new THREE.SphereGeometry(.38,10,8),solid('#d4b398'),-5,2.68,2);
 floatingText(training,'Guide',-5,3.3,2);
 // The practice dummy lives in the same training group, but is managed by
 // the normal enemy/combat system so direct hits are real actions.
 pieces(training,box,wood,0,.22,-7,[3,.44,3]);
 const steps=[[-11,0],[11,0]];
 for(const [x,z] of steps){
  pieces(training,box,stone,x,.4,z,[2.8,.8,2.8]);
  pieces(training,new THREE.TorusGeometry(.7,.11,7,24),solid('#c4b77e'),x,1.2,z).rotation.x=Math.PI/2;
 }
 // Open sky portal courtyard: only the gateway to Oakrest has energy.
 pieces(realm,new THREE.CylinderGeometry(20,23,.85,48),solid('#5a6973'),0,-.6,0);
 pieces(realm,new THREE.CylinderGeometry(16,16.8,.2,48),solid('#a09c91'),0,-.09,0);
 pieces(realm,new THREE.TorusGeometry(13,.24,9,48),solid('#adac8d'),0,.035,0).rotation.x=Math.PI/2;
 for(let i=0;i<10;i++){
  const a=i/10*Math.PI*2;
  pieces(realm,pillar,solid('#839190'),Math.sin(a)*15,.85,Math.cos(a)*15,[1,1.7,1]);addWorldObstacle({x:Math.sin(a)*15,z:Math.cos(a)*15,r:.43,height:1.7,area:'realm'});
 }
 for(let i=0;i<14;i++){
  const a=i/14*Math.PI*2,r=21+i%3*1.5;
  pieces(realm,new THREE.IcosahedronGeometry(.9+(i%4)*.26),solid(i%2?'#6f7d89':'#8da6a0'),Math.sin(a)*r,-2+i%4*.4,Math.cos(a)*r);
 }
 const primary=portalArch(realm,0,-11,true);
 const inactive=[portalArch(realm,-11,-1,false,Math.PI/2),portalArch(realm,11,-1,false,-Math.PI/2)];
 for(const [x,z] of [[0,-11],[-11,-1],[11,-1]]){
  pieces(realm,new THREE.CylinderGeometry(2.8,3,.35,24),solid('#b1ab91'),x,.01,z);
 }
 training.visible=false;realm.visible=false;
 return {
  training,realm,tutorialTarget:{x:0,z:-7},cityPortal:{x:0,z:-11},
  getCurrent(area){return area==='tutorial'?training:area==='realm'?realm:null;},
  update(area,t){
   if(area!=='realm')return;
   primary.disc.material.opacity=.57+Math.sin(t*2.5)*.12;
   primary.rune.rotation.z=t*.14;
   for(const item of inactive)item.rune.rotation.z=t*.025;
  }
 };
}
