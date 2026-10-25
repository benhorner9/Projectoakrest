/** Block 4 2.5D combat presenter. All hit resolution lives in classic-combat.js. */
import * as THREE from 'three';
import {ENEMY_COMBAT} from './combat-feel.js';
import {makeClassicActor,makeGroundShadow} from './classic-sprites.js';
const makeTexture=(kind)=>{
 const c=document.createElement('canvas');c.width=96;c.height=100;
 const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 const rect=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const poly=(color,points)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();};
 if(kind==='keeper'||kind==='guardian'){
  poly('#243d35',[[10,91],[23,60],[17,36],[35,28],[48,9],[62,28],[80,36],[73,64],[89,92]]);
  poly('#6b8061',[[19,88],[31,57],[29,38],[47,24],[66,38],[64,59],[78,88]]);
  for(const side of [-1,1])poly('#b09a68',[[48+side*17,39],[48+side*31,18],[48+side*25,5],[48+side*17,25]]);
  poly('#b1e2cd',[[48,43],[57,58],[48,74],[39,58]]);rect('#def2d7',37,34,6,5);rect('#def2d7',55,34,6,5);
 }else if(kind==='mossling'){
  poly('#293c2e',[[20,79],[12,67],[26,29],[42,18],[68,26],[82,68],[74,82]]);
  poly('#6c9760',[[22,78],[17,63],[29,32],[43,22],[65,30],[77,64],[70,78]]);
  rect('#a2c98e',33,38,27,16);rect('#243f2e',34,43,7,8);rect('#243f2e',54,43,7,8);
  for(let i=0;i<5;i++)poly('#90b077',[[23+i*11,31],[29+i*11,19],[34+i*11,34]]);
 }else if(kind==='boar'){
  rect('#53352d',15,48,68,31);rect('#926849',19,39,61,34);
  rect('#3f302b',18,77,13,16);rect('#3f302b',60,77,14,16);
  rect('#aa8560',25,28,41,36);rect('#40332a',30,41,8,8);
  rect('#40332a',58,41,8,8);rect('#bd9780',37,54,27,17);
  rect('#694c3c',41,60,6,5);rect('#694c3c',55,60,6,5);
  poly('#e2d8b2',[[30,65],[20,57],[26,73]]);
  poly('#e2d8b2',[[70,65],[80,57],[74,73]]);
 }
 const texture=new THREE.CanvasTexture(c);
 texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
 texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
};
function labelTexture(name,level){
 const c=document.createElement('canvas');c.width=256;c.height=72;
 const ctx=c.getContext('2d');ctx.fillStyle='#20372bdc';ctx.fillRect(4,8,248,54);
 ctx.strokeStyle='#a38c5c';ctx.lineWidth=3;ctx.strokeRect(4,8,248,54);
 ctx.fillStyle='#eee3c9';ctx.font='bold 21px Georgia,serif';
 ctx.textAlign='center';ctx.fillText(name+'  Lv '+level,128,43,245);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 return t;
}
const assets={mossling:makeTexture('mossling'),boar:makeTexture('boar'),keeper:makeTexture('keeper'),guardian:makeTexture('guardian')};
export function createClassicCombatView(scene,spawns){
 const actors=new Map(),warningMeshes=new Map(),projectileNodes=[];
 // A subtle ground circle replaces hard "target lock" visuals.
 const selectedRing=new THREE.Mesh(new THREE.RingGeometry(.92,1.06,40),
  new THREE.MeshBasicMaterial({color:'#f5d58e',transparent:true,opacity:.76,
   side:THREE.DoubleSide,depthWrite:false,depthTest:false}));
 selectedRing.rotation.x=-Math.PI/2;selectedRing.position.y=.09;selectedRing.renderOrder=4;
 selectedRing.visible=false;scene.add(selectedRing);
 for(const e of spawns){
  let model;
  if(e.type==='bandit'||e.type==='dummy'){
   model=makeClassicActor({style:'melee',coat:e.type==='bandit'?'#785d50':'#9c8769',
    skin:'#c99a76',hair:'#4a3328',npc:true,armed:e.type==='bandit'});
  }else{
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
    map:assets[e.boss?'keeper':e.id==='guardian'?'guardian':e.type],transparent:true,alphaTest:.06,depthWrite:false
   }));
   sprite.scale.set(e.boss?4.6:e.id==='guardian'?3.7:e.type==='boar'?3.2:2.35,e.boss?4.8:e.id==='guardian'?3.9:e.type==='boar'?2.6:2.5,1);
   sprite.center.set(.5,0);model={sprite,update:()=>{}};
  }
  const shadow=makeGroundShadow();
  const label=new THREE.Sprite(new THREE.SpriteMaterial({
   map:labelTexture(e.name,e.level),
   transparent:true,depthWrite:false
  }));
  label.scale.set(3.7,1.05,1);label.position.set(e.x,3.3,e.z);
  const hpBackground=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.19),
   new THREE.MeshBasicMaterial({color:'#432f2c',side:THREE.DoubleSide,depthWrite:false}));
  const hpFill=new THREE.Mesh(new THREE.PlaneGeometry(2.25,.14),
   new THREE.MeshBasicMaterial({color:e.type==='dummy'?'#a2a7a0':'#b7654f',
    side:THREE.DoubleSide,depthWrite:false}));
  hpBackground.rotation.x=-Math.PI/2;hpFill.rotation.x=-Math.PI/2;
  scene.add(model.sprite,shadow,label,hpBackground,hpFill);
  actors.set(e.id,{...model,shadow,label,hpBackground,hpFill});
 }
 function warningGeometry(w){
  if(w.kind==='pounce')return new THREE.CircleGeometry(w.radius,40);
  if(w.kind==='charge')return new THREE.PlaneGeometry(w.width*2,w.length);
  return new THREE.CircleGeometry(w.radius,40,
   -Math.PI/2-w.halfAngle,w.halfAngle*2);
 }
 function updateWarnings(monsters,t){
  const activeIds=new Set();
  for(const e of monsters){
   if(!e.warning||e.dead)continue;
   const w=e.warning;activeIds.add(e.id);
   if(!warningMeshes.has(e.id)){
    const mat=new THREE.MeshBasicMaterial({color:'#d34b49',transparent:true,opacity:.27,
     depthWrite:false,side:THREE.DoubleSide});
    const plane=new THREE.Mesh(warningGeometry(w),mat);plane.rotation.x=-Math.PI/2;
    if(w.kind==='charge'){
     plane.rotation.set(-Math.PI/2,0,Math.atan2(w.direction.x,-w.direction.z));
     plane.position.set(w.x+w.direction.x*w.length*.5,.075,w.z+w.direction.z*w.length*.5);
    }else{
     plane.position.set(w.x,.075,w.z);
     if(w.kind==='cleave')plane.rotation.z=Math.atan2(w.direction.x,-w.direction.z);
    }
    scene.add(plane);warningMeshes.set(e.id,plane);
   }
   const plane=warningMeshes.get(e.id);
   plane.material.opacity=.25+.16*(.5+.5*Math.sin(t*19));
  }
  for(const [id,obj] of warningMeshes)if(!activeIds.has(id)){
   scene.remove(obj);obj.geometry.dispose();obj.material.dispose();warningMeshes.delete(id);
  }
 }
 const projectileGeometry=new THREE.SphereGeometry(.16,8,6);
 function update(snapshot,cameraOffset,player){
  const t=snapshot.time;
  const selected=snapshot.target;
  selectedRing.visible=!!selected&&!selected.dead&&!selected.hidden;
  if(selectedRing.visible){
   selectedRing.position.x=selected.x;selectedRing.position.z=selected.z;
   selectedRing.scale.setScalar(1+.05*Math.sin(t*4));
  }
  for(const enemy of snapshot.monsters){
   const actor=actors.get(enemy.id);
   if(!actor)continue;
   const show=!enemy.dead&&!enemy.hidden,hit=enemy.hitFlashUntil>t;
   const dx=enemy.x-(actor.lastX??enemy.x),dz=enemy.z-(actor.lastZ??enemy.z);
   if(Math.hypot(dx,dz)>.001)actor.facing={x:dx,z:dz};
   else if(enemy.aggro&&player)actor.facing={x:player.x-enemy.x,z:player.z-enemy.z};
   if(actor.hadWarning&&!enemy.warning)actor.releaseUntil=t+.22;
   actor.hadWarning=!!enemy.warning;actor.lastX=enemy.x;actor.lastZ=enemy.z;
   actor.sprite.visible=show;actor.shadow.visible=show;
   actor.label.visible=show;
   // Avoid floating health bars on every peaceful creature.
   const displayHealth=show&&(enemy.hp<enemy.maxHp||enemy.aggro||selected?.id===enemy.id);
   actor.hpBackground.visible=displayHealth;actor.hpFill.visible=displayHealth;
   actor.sprite.position.set(enemy.x,.12+(show&&enemy.aggro ? .06 : 0),enemy.z);
   actor.shadow.position.set(enemy.x,.035,enemy.z);
   actor.label.position.set(enemy.x,enemy.boss?5.6:enemy.id==='guardian'?4.6:enemy.type==='boar'?3.5:3.65,enemy.z);
   actor.hpBackground.position.set(enemy.x,2.72,enemy.z);
   const fraction=Math.max(.005,enemy.hp/enemy.maxHp);
   actor.hpFill.scale.set(fraction,1,1);
   actor.hpFill.position.set(enemy.x-(1-fraction)*1.125,2.735,enemy.z);
   actor.sprite.material.color.set(hit?'#f9ad89':enemy.weak==='magic'?'#bad6cf':enemy.weak==='ranged'?'#cabce0':'#ffffff');
   actor.update({facing:actor.facing||{x:0,z:1},cameraOffset,pose:enemy.warning?'windup':t<(actor.releaseUntil||0)?'strike':'idle',step:Math.hypot(dx,dz)>.001?1+Math.floor(t*5)%2:0});
  }
  updateWarnings(snapshot.monsters,t);
  while(projectileNodes.length<snapshot.projectiles.length){
   const mesh=new THREE.Mesh(projectileGeometry,
    new THREE.MeshBasicMaterial({color:'#e8bc77'}));
   scene.add(mesh);projectileNodes.push(mesh);
  }
  while(projectileNodes.length>snapshot.projectiles.length){
   const mesh=projectileNodes.pop();scene.remove(mesh);mesh.material.dispose();
  }
  snapshot.projectiles.forEach((p,i)=>{
   const mesh=projectileNodes[i];
   mesh.position.set(p.x,1.55,p.z);
   mesh.material.color.set(p.style==='magic'?'#a5d6ee':'#ead3a0');
   mesh.scale.set(p.style==='magic'?1.6:1,1,1);
  });
 }
 function hitObjects(){return [...actors.entries()].map(([id,a])=>({id,object:a.sprite}));}
 return {update,hitObjects,
  dispose(){
   scene.remove(selectedRing);selectedRing.geometry.dispose();selectedRing.material.dispose();
   for(const mesh of projectileNodes){scene.remove(mesh);mesh.material.dispose();}
   for(const [id,mesh] of warningMeshes){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
   for(const actor of actors.values()){
    for(const obj of [actor.sprite,actor.shadow,actor.label,actor.hpBackground,actor.hpFill])scene.remove(obj);
   }
  }
 };
}
