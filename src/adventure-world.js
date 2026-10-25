import {createOakrestTree} from './classic-village.js';
import * as THREE from 'three';
import {ADVENTURE_TARGETS,ADVENTURE_PATHS,ADVENTURE_TREES,ADVENTURE_WALLS,DUNGEON_ROOMS,ADVENTURE_SCENERY} from './adventure-content.js';
import {makeClassicActor} from './classic-sprites.js';
import {createClassicQuestBeacon} from './classic-quest-beacon.js';
import {QUEST_GIVER_IDS} from './classic-quest-indicators.js';
/** Lightweight shared geometry; scene geometry and map use the same content anchors. */
export function createAdventureWorld(scene){
 const root=new THREE.Group();scene.add(root);
 const geometry=new THREE.BoxGeometry(1,1,1),materials=new Map(),actors=[],beacons=[];
 const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshLambertMaterial({color}));return materials.get(color);};
 function box(x,y,z,w,h,d,color){const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);return m;}
 function label(text,x,z,y=2.6){
  const c=document.createElement('canvas');c.width=512;c.height=64;const ctx=c.getContext('2d');
  ctx.fillStyle='#26352ce8';ctx.fillRect(0,0,512,64);ctx.font='bold 24px Georgia';ctx.fillStyle='#f2e3b7';ctx.textAlign='center';ctx.fillText(text,256,41,495);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.scale.set(6.5,.82,1);sprite.position.set(x,y,z);root.add(sprite);return sprite;
 }
 for(const g of ADVENTURE_SCENERY.ground)box(g.x,g.y,g.z,g.w,g.h,g.d,g.color);
 for(const [i,r] of DUNGEON_ROOMS.entries()){
  box(0,-.025,(r.minZ+r.maxZ)/2,33,.05,r.maxZ-r.minZ,ADVENTURE_SCENERY.roomColours[i]);
  label(r.name,0,r.minZ+4,4);
  for(const x of [-14,14]){box(x,.4,r.minZ+8,1.2,.8,1.2,'#8b927d');const flame=new THREE.Mesh(new THREE.OctahedronGeometry(.4),mat('#bdc78b'));flame.position.set(x,1.4,r.minZ+8);root.add(flame);}
 }
 for(const path of ADVENTURE_PATHS)for(let i=1;i<path.length;i++){
  const [x1,z1]=path[i-1],[x2,z2]=path[i],dx=x2-x1,dz=z2-z1;
  const road=box((x1+x2)/2,.015,(z1+z2)/2,3.6,.04,Math.hypot(dx,dz),'#a08e6b');road.rotation.y=Math.atan2(dx,dz);
 }
 for(const w of ADVENTURE_WALLS){box(w.x,1.4,w.z,w.w,2.8,w.d,'#65716b');box(w.x,2.85,w.z,w.w+.2,.15,w.d+.2,'#889584');}
 // The creek runs beside, rather than across, its accessible investigation path.
 for(const creek of ADVENTURE_SCENERY.creek)box(creek.x,creek.y,creek.z,creek.w,creek.h,creek.d,creek.color);
 for(const [i,t] of ADVENTURE_TREES.entries())createOakrestTree(root,t.x,t.z,i,.9);

 const gates=[241,269,297].map(z=>box(0,1.5,z,6,3,.5,'#769b91'));
 const markers=new Map();
 for(const t of ADVENTURE_TARGETS){
  const g=new THREE.Group();g.userData.interactId=t.id;root.add(g);
  const sign=label(t.name,t.x,t.z,t.kind==='adventure-npc'?6.15:2.5);sign.userData.interactId=t.id;
  markers.set(t.id,sign);
  if(t.kind==='adventure-npc'){
   const actor=makeClassicActor({coat:t.id.endsWith('scribe')?'#7388a1':'#a38b62',npc:true,armed:false});actor.sprite.position.set(t.x,.08,t.z);actor.sprite.userData.interactId=t.id;root.add(actor.sprite);actors.push(actor);
   if(QUEST_GIVER_IDS.includes(t.id))beacons.push(createClassicQuestBeacon(root,t.x,t.z,t.id));
  }else if(t.kind==='resource'){
   if(t.material==='softwood-logs'){box(t.x,1,t.z,.6,2,.6,'#7c6045');box(t.x,3,t.z,2.2,2.3,2.2,'#638658');}
   else if(t.material==='reed')for(let i=0;i<5;i++)box(t.x+i*.25-.5,.6,t.z+(i%2)*.3,.12,1.2,.12,'#b2b785');
   else {const ore=new THREE.Mesh(new THREE.DodecahedronGeometry(1),mat(t.material==='copper-ore'?'#b28765':'#9aa9a8'));ore.position.set(t.x,.65,t.z);ore.userData.interactId=t.id;root.add(ore);}
  }else if(t.kind==='station'){const bench=box(t.x,.65,t.z,2,1.3,1.2,'#856c51');bench.userData.interactId=t.id;box(t.x,1.4,t.z,2.3,.2,1.4,'#b0a183');}
  else if(t.kind==='entrance'){
   for(const dx of [-3,3])box(t.x+dx,2,t.z,2,4,3,'#596450');box(t.x,4,t.z,8,1.2,3,'#596450');
   box(t.x,.03,t.z,4,.1,3,'#1e3436');
  }else{const stone=box(t.x,.7,t.z,1.2,1.4,1.2,t.kind==='ward'||t.kind==='heart'?'#84a7a0':'#9b9479');stone.userData.interactId=t.id;}
 }
 // Abandoned canvas shelters, broken wagon and fallen roots tell the route's story.
 const wagon=ADVENTURE_SCENERY.wagon;
 box(wagon.x,.7,wagon.z,wagon.w,.35,wagon.d,'#735c43');for(const dx of [-1.5,1.5])box(wagon.x+dx,.35,wagon.z,.3,.7,2,'#4d493d');
 const tent=new THREE.Mesh(new THREE.ConeGeometry(2.5,2.8,4),mat('#aa9b7c'));tent.position.set(ADVENTURE_SCENERY.camp.x,1.4,ADVENTURE_SCENERY.camp.z);tent.rotation.y=Math.PI/4;root.add(tent);
 for(const [x,z] of ADVENTURE_SCENERY.logs){const log=box(x,.5,z,5,.8,1,'#4e4d3c');log.rotation.y=.6;}
 return {root,update(state,player,cameraOffset,time=0){
  gates.forEach((g,i)=>{g.visible=!state?.run?.wards.includes(i);});
  for(const actor of actors)actor.update({facing:{x:0,z:-1},cameraOffset});
  for(const beacon of beacons)beacon.update(state,time);
  for(const [id,m] of markers){const t=ADVENTURE_TARGETS.find(t=>t.id===id);m.visible=Math.hypot(player.x-t.x,player.z-t.z)<27;}
 }};
}
