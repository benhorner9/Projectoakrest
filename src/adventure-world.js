import * as THREE from 'three';
import {ADVENTURE_TARGETS,ADVENTURE_PATHS,ADVENTURE_TREES,ADVENTURE_WALLS,DUNGEON_ROOMS} from './adventure-content.js';
import {makeClassicActor} from './classic-sprites.js';
/** Lightweight shared geometry; scene geometry and map use the same content anchors. */
export function createAdventureWorld(scene){
 const root=new THREE.Group();scene.add(root);
 const geometry=new THREE.BoxGeometry(1,1,1),materials=new Map(),actors=[];
 const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshLambertMaterial({color}));return materials.get(color);};
 function box(x,y,z,w,h,d,color){const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);return m;}
 function label(text,x,z,y=2.6){
  const c=document.createElement('canvas');c.width=512;c.height=64;const ctx=c.getContext('2d');
  ctx.fillStyle='#26352ce8';ctx.fillRect(0,0,512,64);ctx.font='bold 24px Georgia';ctx.fillStyle='#f2e3b7';ctx.textAlign='center';ctx.fillText(text,256,41,495);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.scale.set(6.5,.82,1);sprite.position.set(x,y,z);root.add(sprite);return sprite;
 }
 box(0,-.2,146,106,.3,104,'#627756');
 box(-25,-.025,137,47,.04,42,'#4b654c');
 box(24,-.015,157,24,.05,26,'#8a8468');
 box(0,-.2,267,106,.3,138,'#313b40');
 for(const [i,r] of DUNGEON_ROOMS.entries()){
  box(0,-.025,(r.minZ+r.maxZ)/2,33,.05,r.maxZ-r.minZ,['#56605a','#4c6167','#625d55','#4b6260'][i]);
  label(r.name,0,r.minZ+4,4);
  for(const x of [-14,14]){box(x,.4,r.minZ+8,1.2,.8,1.2,'#8b927d');const flame=new THREE.Mesh(new THREE.OctahedronGeometry(.4),mat('#bdc78b'));flame.position.set(x,1.4,r.minZ+8);root.add(flame);}
 }
 for(const path of ADVENTURE_PATHS)for(let i=1;i<path.length;i++){
  const [x1,z1]=path[i-1],[x2,z2]=path[i],dx=x2-x1,dz=z2-z1;
  const road=box((x1+x2)/2,.015,(z1+z2)/2,3.6,.04,Math.hypot(dx,dz),'#a08e6b');road.rotation.y=Math.atan2(dx,dz);
 }
 for(const w of ADVENTURE_WALLS){box(w.x,1.4,w.z,w.w,2.8,w.d,'#65716b');box(w.x,2.85,w.z,w.w+.2,.15,w.d+.2,'#889584');}
 // The creek runs beside, rather than across, its accessible investigation path.
 box(32,.025,114,3.5,.04,24,'#729a9c');
 box(30,.02,137,2,.04,19,'#729a9c');
 for(const t of ADVENTURE_TREES){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.35,t.r,3,5),mat('#6c5944'));trunk.position.set(t.x,1.5,t.z);root.add(trunk);
  const crown=new THREE.Mesh(new THREE.ConeGeometry(2,4,6),mat(t.z>125?'#385743':'#5d7d50'));crown.position.set(t.x,4,t.z);root.add(crown);
 }
 const gates=[241,269,297].map(z=>box(0,1.5,z,6,3,.5,'#769b91'));
 const markers=new Map();
 for(const t of ADVENTURE_TARGETS){
  const g=new THREE.Group();g.userData.interactId=t.id;root.add(g);
  const sign=label(t.name,t.x,t.z,t.kind==='adventure-npc'?3.1:2.5);sign.userData.interactId=t.id;
  markers.set(t.id,sign);
  if(t.kind==='adventure-npc'){
   const actor=makeClassicActor({coat:t.id.endsWith('scribe')?'#7388a1':'#a38b62',npc:true,armed:false});actor.sprite.position.set(t.x,.08,t.z);actor.sprite.userData.interactId=t.id;root.add(actor.sprite);actors.push(actor);
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
 box(-8,.7,108,3,.35,1.7,'#735c43');for(const x of [-9.5,-6.5])box(x,.35,108,.3,.7,2,'#4d493d');
 const tent=new THREE.Mesh(new THREE.ConeGeometry(2.5,2.8,4),mat('#aa9b7c'));tent.position.set(26,1.4,155);tent.rotation.y=Math.PI/4;root.add(tent);
 for(const [x,z] of [[-30,130],[-34,136],[5,180]]){const log=box(x,.5,z,5,.8,1,'#4e4d3c');log.rotation.y=.6;}
 return {root,update(state,player,cameraOffset){
  gates.forEach((g,i)=>{g.visible=!state?.run?.wards.includes(i);});
  for(const actor of actors)actor.update({facing:{x:0,z:-1},cameraOffset});
  for(const [id,m] of markers){const t=ADVENTURE_TARGETS.find(t=>t.id===id);m.visible=Math.hypot(player.x-t.x,player.z-t.z)<27;}
 }};
}
