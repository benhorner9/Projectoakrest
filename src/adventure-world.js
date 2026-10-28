import {createOakrestTree} from './classic-village.js';
import {applySkillTreeVisual} from './classic-skill-visuals.js';
import * as THREE from 'three';
import {ADVENTURE_TARGETS,ADVENTURE_PATHS,ADVENTURE_TREES,ADVENTURE_WALLS,DUNGEON_ROOMS,ADVENTURE_SCENERY} from './adventure-content.js';
import {makeClassicActor} from './classic-sprites.js';
import {createClassicQuestBeacon} from './classic-quest-beacon.js';
import {QUEST_GIVER_IDS} from './classic-quest-indicators.js';
import {groundPolygons} from './classic-terrain-view.js';
import {terrainVariation,terrainPatch,organicRoadPolygons,trailDetailPolygons,OAKREST_PALETTE} from './classic-art-direction.js';
/** Lightweight shared geometry; scene geometry and map use the same content anchors. */
export function createAdventureWorld(scene){
 const root=new THREE.Group();scene.add(root);
 const geometry=new THREE.BoxGeometry(1,1,1),materials=new Map(),actors=[],beacons=[],resources=new Map();
 const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshLambertMaterial({color}));return materials.get(color);};
 function box(x,y,z,w,h,d,color){const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);return m;}
 function label(text,x,z,y=2.6){
  const c=document.createElement('canvas');c.width=512;c.height=64;const ctx=c.getContext('2d');
  ctx.fillStyle='#26352ce8';ctx.fillRect(0,0,512,64);ctx.font='bold 24px Georgia';ctx.fillStyle='#f2e3b7';ctx.textAlign='center';ctx.fillText(text,256,41,495);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.scale.set(6.5,.82,1);sprite.position.set(x,y,z);root.add(sprite);return sprite;
 }
 // Undulating vertex-colour meshes replace giant hard-edged rectangular grass slabs.
 // Geometry remains below the fixed gameplay plane so combat and navigation stay authoritative.
 for(const [index,g] of ADVENTURE_SCENERY.ground.entries()){
  const geometry=new THREE.PlaneGeometry(g.w,g.d,
   Math.max(4,Math.ceil(g.w/3)),Math.max(4,Math.ceil(g.d/3)));
  geometry.rotateX(-Math.PI/2);geometry.translate(g.x,0,g.z);
  const positions=geometry.attributes.position,colors=[];
  const base=new THREE.Color(g.color),forest=new THREE.Color('#718b68'),
   gravel=new THREE.Color('#9d9976');
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),z=positions.getZ(i),n=terrainVariation(x,z),p=terrainPatch(x,z);
   positions.setY(i,-.037+index*.004+(p-.5)*.009);
   const c=base.clone().lerp(index===3?gravel:forest,n*.27).lerp(base,p*.12);
   colors.push(c.r,c.g,c.b);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const plane=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  plane.name='oakrest-frontier-ground-'+index;root.add(plane);
 }
 for(const [i,r] of DUNGEON_ROOMS.entries()){
  box(0,-.025,(r.minZ+r.maxZ)/2,33,.05,r.maxZ-r.minZ,ADVENTURE_SCENERY.roomColours[i]);
  label(r.name,0,r.minZ+4,4);
  for(const x of [-14,14]){box(x,.4,r.minZ+8,1.2,.8,1.2,'#8b927d');const flame=new THREE.Mesh(new THREE.OctahedronGeometry(.4),mat('#bdc78b'));flame.position.set(x,1.4,r.minZ+8);root.add(flame);}
 }
 // Frontier lanes are now real continuous dirt paths, not rectangular boxes at every bend.
 const outerPaths=ADVENTURE_PATHS.filter(path=>path[0][1]<195);
 const cavePaths=ADVENTURE_PATHS.filter(path=>path[0][1]>=195);
 for(const [paths,width,y,col,name] of [
  [outerPaths,6.4,.002,OAKREST_PALETTE.verge,'frontier-grass-verge'],
  [outerPaths,5.1,.008,OAKREST_PALETTE.earth,'frontier-track-shoulder'],
  [outerPaths,3.55,.017,OAKREST_PALETTE.path,'frontier-packed-track'],
  [cavePaths,4.15,.014,'#697671','hollow-stone-path'],
  [cavePaths,2.7,.023,'#8d9689','hollow-worn-centre']
 ]){
  const mesh=groundPolygons(organicRoadPolygons(paths,width),y,col);
  mesh.name=name;root.add(mesh);
 }
 const patches=trailDetailPolygons(outerPaths);
 const gravel=groundPolygons(patches.gravel,.027,OAKREST_PALETTE.gravel);
 gravel.name='frontier-scattered-gravel';root.add(gravel);
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
   if(t.material==='softwood-logs'){
    const tree=createOakrestTree(root,t.x,t.z,17,.82);
    tree.userData.interactId=t.id;tree.userData.dynamic=true;
    const stump=box(t.x,.25,t.z,.72,.5,.72,'#705238');stump.visible=false;
    resources.set(t.id,{tree,stump});
   }else if(t.material==='reed'){
    const reeds=[];
    for(let i=0;i<5;i++)reeds.push(box(t.x+i*.25-.5,.6,t.z+(i%2)*.3,.12,1.2,.12,'#b2b785'));
    resources.set(t.id,{reeds});
   }else{
    const ore=new THREE.Mesh(new THREE.DodecahedronGeometry(1),mat(t.material==='copper-ore'?'#b28765':'#9aa9a8'));
    ore.position.set(t.x,.65,t.z);ore.userData.interactId=t.id;root.add(ore);
    resources.set(t.id,{ore});
   }
  }else if(t.kind==='station'){
   const bench=box(t.x,.65,t.z,2,1.3,1.2,'#856c51');bench.userData.interactId=t.id;
   box(t.x,1.4,t.z,2.3,.2,1.4,'#b0a183');
  }
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
 // Reuse one tiny particle set for ore chips, bark and forge sparks, avoiding
 // a new particle emitter per resource on iPad.
 const particles=new THREE.Group();root.add(particles);particles.visible=false;
 const chipGeometry=new THREE.TetrahedronGeometry(.16);
 const chipMaterials={wood:mat('#b69b73'),stone:mat('#c5c8bf'),forge:mat('#efb66e'),reed:mat('#b4d395')};
 for(let i=0;i<6;i++){
  const chip=new THREE.Mesh(chipGeometry,chipMaterials.wood);particles.add(chip);
 }
 return {root,update(state,player,cameraOffset,time=0,action=null){
  gates.forEach((g,i)=>{g.visible=!state?.run?.wards.includes(i);});
  for(const actor of actors)actor.update({facing:{x:0,z:-1},cameraOffset});
  for(const beacon of beacons)beacon.update(state,time);
  for(const [id,m] of markers){const t=ADVENTURE_TARGETS.find(t=>t.id===id);m.visible=Math.hypot(player.x-t.x,player.z-t.z)<27;}
  const treeStates=new Map((state?.trees||[]).map(tree=>[tree.id,tree]));
  for(const [id,visual] of resources){
   if(visual.tree)applySkillTreeVisual(visual.tree,visual.stump,treeStates.get(id),action,time);
   const hit=action?.kind==='working'&&action.targetId===id&&action.pose==='work-contact';
   if(visual.ore)visual.ore.rotation.z=hit?Math.sin(action.progress*32)*.11:0;
   if(visual.reeds)for(const [i,reed] of visual.reeds.entries())
    reed.rotation.z=hit?Math.sin(action.progress*29+i)*.16:0;
  }
  const contact=action?.kind==='working'&&action.pose==='work-contact'&&action.target;
  particles.visible=!!contact;
  if(contact){
   const type=action.skill==='blacksmithing'?'forge':action.skill==='mining'?'stone':
    action.skill==='foraging'?'reed':'wood';
   particles.position.set(action.target.x,action.skill==='blacksmithing'?1.75:1.3,action.target.z);
   const phase=(action.progress-.35)/.38;
   for(const [i,chip] of particles.children.entries()){
    const angle=i*Math.PI/3;
    chip.material=chipMaterials[type];
    chip.position.set(Math.cos(angle)*phase*.6,Math.sin(phase*Math.PI)*(.3+i*.07),Math.sin(angle)*phase*.6);
    chip.rotation.z=phase*(i+1);
   }
  }
 }};
}
