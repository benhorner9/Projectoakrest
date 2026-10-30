/** Block 4 2.5D combat presenter. All hit resolution lives in classic-combat.js. */
import * as THREE from 'three';
import {ENEMY_COMBAT,ENEMY_PATTERNS} from './combat-feel.js';
import {makeClassicActor,makeGroundShadow} from './classic-sprites.js';
import {hitRecoilStrength} from './classic-combat-impacts.js';
import {classicAttackPose,classicEnemyProfile,classicDeathProgress} from './classic-combat-motion.js';
import {createClassicProjectileView} from './classic-projectile-view.js';
import {classicCreaturePose,createClassicEnemyAtlas} from './classic-enemy-art.js';
function labelTexture(name,level){
 const c=document.createElement('canvas');c.width=256;c.height=72;
 const ctx=c.getContext('2d');ctx.fillStyle='#20372bdc';ctx.fillRect(4,8,248,54);
 ctx.strokeStyle='#a38c5c';ctx.lineWidth=3;ctx.strokeRect(4,8,248,54);
 ctx.fillStyle='#eee3c9';ctx.font='bold 21px Georgia,serif';
 ctx.textAlign='center';ctx.fillText(name+'  Lv '+level,128,43,245);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 return t;
}
export function createClassicCombatView(scene,spawns,{reducedMotion=false}={}){
 const actors=new Map(),warningMeshes=new Map(),atlas=createClassicEnemyAtlas();
 const projectileView=createClassicProjectileView(scene,{reducedMotion});
 // A subtle ground circle replaces hard "target lock" visuals.
 const selectedRing=new THREE.Mesh(new THREE.RingGeometry(.92,1.06,40),
  new THREE.MeshBasicMaterial({color:'#f5d58e',transparent:true,opacity:.76,
   side:THREE.DoubleSide,depthWrite:false,depthTest:false}));
 selectedRing.rotation.x=-Math.PI/2;selectedRing.position.y=.09;selectedRing.renderOrder=4;
 selectedRing.visible=false;scene.add(selectedRing);
 for(const e of spawns){
  let model;
  if(e.type==='bandit'||e.type==='dummy'){
   const caster=e.type==='bandit'&&classicEnemyProfile(e,e.pattern||ENEMY_PATTERNS[e.type]).caster;
   model=makeClassicActor({style:caster?'magic':'melee',coat:caster?'#657c79':e.type==='bandit'?'#785d50':'#9c8769',
    skin:'#c99a76',hair:'#4a3328',npc:true,armed:e.type==='bandit',npcWeapon:caster?'frost':'sword'});
  }else{
   const kind=e.boss?'keeper':e.id==='guardian'?'guardian':e.type;
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
    map:atlas.get(kind),transparent:true,alphaTest:.06,depthWrite:false
   }));
   sprite.scale.set(e.boss?4.6:e.id==='guardian'?3.7:e.type==='boar'?3.2:2.35,e.boss?4.8:e.id==='guardian'?3.9:e.type==='boar'?2.6:2.5,1);
   sprite.center.set(.5,0);model={sprite,update:()=>{},visualKind:kind};
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
  actors.set(e.id,{...model,shadow,label,hpBackground,hpFill,baseScale:model.sprite.scale.clone()});
 }
 function warningGeometry(w){
  if(w.kind==='pounce')return new THREE.CircleGeometry(w.radius,40);
  if(w.kind==='charge')return new THREE.PlaneGeometry(w.width*2,w.length);
  return new THREE.CircleGeometry(w.radius,40,
   -Math.PI/2-w.halfAngle,w.halfAngle*2);
 }
 function warningContour(w){
  const points=[];
  if(w.kind==='charge'){
   points.push(new THREE.Vector3(-w.width,-w.length/2,0),new THREE.Vector3(w.width,-w.length/2,0),
    new THREE.Vector3(w.width,w.length/2,0),new THREE.Vector3(-w.width,w.length/2,0));
  }else{
   const radius=w.radius,segments=40,start=w.kind==='cleave'?-Math.PI/2-w.halfAngle:0,
    sweep=w.kind==='cleave'?w.halfAngle*2:Math.PI*2;
   if(w.kind==='cleave')points.push(new THREE.Vector3(0,0,0));
   for(let i=0;i<=(w.kind==='cleave'?segments:segments-1);i++){
    const a=start+sweep*i/segments;
    points.push(new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,0));
   }
  }
  return new THREE.BufferGeometry().setFromPoints(points);
 }
 function disposeWarning(plane){
  scene.remove(plane);
  const edge=plane.userData.edge;
  if(edge){plane.remove(edge);edge.geometry.dispose();edge.material.dispose();}
  plane.geometry.dispose();plane.material.dispose();
 }
 function updateWarnings(monsters,t){
  const activeIds=new Set();
  for(const e of monsters){
   if(!e.warning||e.dead)continue;
   const w=e.warning;activeIds.add(e.id);
   const previous=warningMeshes.get(e.id);
   if(previous&&previous.userData.startedAt!==w.startedAt){
    disposeWarning(previous);warningMeshes.delete(e.id);
   }
   if(!warningMeshes.has(e.id)){
    const mat=new THREE.MeshBasicMaterial({color:w.kind==='charge'?'#da794a':w.kind==='cleave'?'#c96050':'#cd5351',transparent:true,opacity:.27,
     depthWrite:false,side:THREE.DoubleSide});
    const plane=new THREE.Mesh(warningGeometry(w),mat);plane.rotation.x=-Math.PI/2;
    if(w.kind==='charge'){
     plane.rotation.set(-Math.PI/2,0,Math.atan2(w.direction.x,-w.direction.z));
     plane.position.set(w.x+w.direction.x*w.length*.5,.075,w.z+w.direction.z*w.length*.5);
    }else{
     plane.position.set(w.x,.075,w.z);
     if(w.kind==='cleave')plane.rotation.z=Math.atan2(w.direction.x,-w.direction.z);
    }
    const edge=new THREE.LineLoop(warningContour(w),new THREE.LineBasicMaterial({
     color:w.kind==='charge'?'#ffd99b':'#ffdfb6',transparent:true,opacity:.77,
     depthWrite:false,depthTest:false
    }));
    edge.position.z=.016;edge.renderOrder=5;plane.add(edge);plane.userData.edge=edge;
    plane.userData.startedAt=w.startedAt;scene.add(plane);warningMeshes.set(e.id,plane);
   }
   const plane=warningMeshes.get(e.id);
   const progress=Math.max(0,Math.min(1,(t-w.startedAt)/Math.max(.001,w.end-w.startedAt)));
   // Warning outlines share the exact authoritative geometry and direction.
   // A final-beat brightness cue announces danger without changing hit timing.
   plane.material.opacity=.20+progress*.28+(reducedMotion?0:Math.sin(progress*Math.PI*6)*.035);
   plane.userData.edge.material.opacity=.58+progress*.4;
  }
  for(const [id,obj] of warningMeshes)if(!activeIds.has(id)){
   disposeWarning(obj);warningMeshes.delete(id);
  }
 }
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
   const death=classicDeathProgress(enemy,t),dying=!enemy.hidden&&death!==null&&death<1;
   const dx=enemy.x-(actor.lastX??enemy.x),dz=enemy.z-(actor.lastZ??enemy.z);
   if(Math.hypot(dx,dz)>.001)actor.facing={x:dx,z:dz};
   else if(enemy.aggro&&player)actor.facing={x:player.x-enemy.x,z:player.z-enemy.z};
   actor.releaseUntil=enemy.releaseUntil||0;
   actor.hadWarning=!!enemy.warning;actor.lastX=enemy.x;actor.lastZ=enemy.z;
   actor.alive=show;actor.sprite.visible=show||dying;actor.shadow.visible=show||dying;
   actor.label.visible=show&&(enemy.aggro||selected?.id===enemy.id);
   // Avoid floating health bars on every peaceful creature.
   const displayHealth=show&&(enemy.hp<enemy.maxHp||enemy.aggro||selected?.id===enemy.id);
   actor.hpBackground.visible=displayHealth;actor.hpFill.visible=displayHealth;
   // Per-hit squash and knockback are visual only. AI coordinates and
   // selection hitboxes retain their authoritative simulated positions.
   const recoil=reducedMotion?0:hitRecoilStrength(enemy.hitFlashUntil,t);
   const awayX=player?enemy.x-player.x:0,awayZ=player?enemy.z-player.z:0,
    awayLength=Math.hypot(awayX,awayZ)||1;
   actor.sprite.position.set(enemy.x+awayX/awayLength*recoil*.19,
    .12+(show&&enemy.aggro?.06:0)+recoil*.11,
    enemy.z+awayZ/awayLength*recoil*.19);
   actor.sprite.scale.copy(actor.baseScale).multiplyScalar(1-recoil*.055);
   // Windup compresses, contact extends, death settles into a short fade.
   // These visual offsets never move collision coordinates or hit geometry.
   const preparation=enemy.warning?Math.max(0,Math.min(1,(t-enemy.warning.startedAt)/(enemy.warning.end-enemy.warning.startedAt))):0;
   const contact=t<(enemy.releaseUntil||0)?Math.max(0,(enemy.releaseUntil-t)/.22):0;
   if(actor.visualKind){
    const pose=classicCreaturePose({moving:Math.hypot(dx,dz)>.001,hit,warning:!!enemy.warning,
     releasing:contact>0,dying,time:t,reducedMotion});
    const frame=atlas.get(actor.visualKind,pose);
    if(actor.sprite.material.map!==frame){actor.sprite.material.map=frame;actor.sprite.material.needsUpdate=true;}
    actor.sprite.userData.visualPose=pose;
   }
   if(!reducedMotion&&!enemy.dead){
    actor.sprite.scale.y*=1-preparation*.07+contact*.07;
    actor.sprite.position.y+=preparation*.07+contact*.12;
   }
   actor.sprite.material.opacity=dying?1-death:1;
   actor.sprite.material.rotation=dying&&!reducedMotion?death*.65:0;
   if(dying&&!reducedMotion){actor.sprite.scale.y*=1-death*.65;actor.sprite.position.y-=death*.15;}
   actor.shadow.material.opacity=dying?.22*(1-death):.22;
   actor.shadow.position.set(enemy.x,.035,enemy.z);
   actor.label.position.set(enemy.x,enemy.boss?5.6:enemy.id==='guardian'?4.6:enemy.type==='boar'?3.5:3.65,enemy.z);
   const healthHeight=actor.sprite.scale.y+.15;
   actor.hpBackground.position.set(enemy.x,healthHeight,enemy.z);
   const fraction=Math.max(.005,enemy.hp/enemy.maxHp);
   actor.hpFill.scale.set(fraction,1,1);
   actor.hpFill.position.set(enemy.x-(1-fraction)*1.125,healthHeight+.015,enemy.z);
   actor.sprite.material.color.set(hit?'#f9ad89':enemy.weak==='magic'?'#bad6cf':enemy.weak==='ranged'?'#cabce0':'#ffffff');
   actor.update({facing:actor.facing||{x:0,z:1},cameraOffset,
    pose:classicAttackPose(t,enemy.warning?{startedAt:enemy.warning.startedAt,until:enemy.warning.end}:null,
     enemy.releaseUntil?{time:enemy.releaseUntil-.22,family:'sword'}:null),
    step:Math.hypot(dx,dz)>.001?1+Math.floor(t*5)%2:0});
  }
  updateWarnings(snapshot.monsters,t);
  projectileView.update(snapshot.projectiles,t);
 }
 function hitObjects(){return [...actors.entries()].filter(([,a])=>a.alive!==false).map(([id,a])=>({id,object:a.sprite}));}
 return {update,hitObjects,stats:()=>({projectiles:projectileView.stats(),creatures:atlas.stats(),warnings:warningMeshes.size,
  actors:[...actors].map(([id,a])=>({id,visible:a.sprite.visible,opacity:a.sprite.material.opacity,scaleY:a.sprite.scale.y,pose:a.sprite.userData.visualPose||a.sprite.userData.pose||'idle',kind:a.visualKind||'humanoid'}))}),
  dispose(){
   scene.remove(selectedRing);selectedRing.geometry.dispose();selectedRing.material.dispose();
   projectileView.dispose();
   for(const [,mesh] of warningMeshes)disposeWarning(mesh);
   warningMeshes.clear();atlas.dispose();
   for(const actor of actors.values()){
    for(const obj of [actor.sprite,actor.shadow,actor.label,actor.hpBackground,actor.hpFill])scene.remove(obj);
    actor.dispose?.();
    if(actor.visualKind)actor.sprite.material.dispose();
    actor.shadow.geometry.dispose();actor.shadow.material.dispose();
    actor.label.material.map?.dispose();actor.label.material.dispose();
    for(const bar of [actor.hpBackground,actor.hpFill]){bar.geometry.dispose();bar.material.dispose();}
   }
  }
 };
}
