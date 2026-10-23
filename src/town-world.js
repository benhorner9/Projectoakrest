import * as THREE from 'three';
import {createSurfaceMaterial} from './visual-fidelity.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {terrainHeight,addWorldObstacle} from './terrain.js';
import {OAKREST_SERVICES,OAKREST_GROVES} from './town-services.js';
import {buildCityIdentity,CITY_DISTRICTS} from './city-identity.js';
import {furnishGrandBank,buildGrandBankFacade} from './bank-architecture.js';
import {buildingCutaway,playerInBuilding} from './building-visibility.js';
import {addArchitecturalFinish,furnishDistinctInterior} from './building-art.js';
import {buildOakrestCityPaths,buildOakrestCityMeadows} from './town-ground.js';
import {furnishTradeHall,finishTradeHouseFacade,finishTradeHouseRoof} from './trade-house-art.js';

/**
 * Walkable starter town. Every building has a real doorway, four separate
 * collidable walls and an interior; roofs lift away while the player is inside.
 * Building orientation is independent of door and service interaction rules.
 */
import {OAKREST_BUILDINGS,OAKREST_PATHS,FACING,localBuildingPosition,OAKREST_WELL,OAKREST_WELL_STEPS,OAKREST_MARKET_STALLS} from './town-layout.js';
export {OAKREST_BUILDINGS,OAKREST_PATHS} from './town-layout.js';
// One physically-based art library shared by buildings, floors and removable
// roofs. The tiny procedural maps are cached globally and never re-generated
// per building; this also keeps the walkable doorway/cutaway system untouched.
const shared={
 plaster:createSurfaceMaterial(THREE,'#d1c4a6','plaster'),
 stone:createSurfaceMaterial(THREE,'#939b8b','limestone'),
 pale:createSurfaceMaterial(THREE,'#b7b9a5','limestone'),
 timber:createSurfaceMaterial(THREE,'#72523a','timber'),
 wood:createSurfaceMaterial(THREE,'#553e31','timber'),
 trim:createSurfaceMaterial(THREE,'#c49f68','timber'),
 slate:createSurfaceMaterial(THREE,'#526d75','slate'),
 moss:createSurfaceMaterial(THREE,'#597760','slate'),
 red:createSurfaceMaterial(THREE,'#955f50','slate'),
 blue:createSurfaceMaterial(THREE,'#758e9a','slate'),
 gold:new THREE.MeshStandardMaterial({color:'#dfbb69',roughness:.33,metalness:.65}),
 cloth:createSurfaceMaterial(THREE,'#b29576','cloth'),
 dirt:createSurfaceMaterial(THREE,'#ac9774','road'),
 dark:new THREE.MeshStandardMaterial({color:'#343c39',roughness:.53,metalness:.18}),
 glass:new THREE.MeshStandardMaterial({color:'#a4c4c0',transparent:true,opacity:.7,roughness:.2,metalness:.03,depthWrite:false}),
 glow:new THREE.MeshBasicMaterial({color:'#ffd58e'})
};
const roofFinishes={};
const floorFinishes={
 wood:createSurfaceMaterial(THREE,'#e3d1b2','timber'),
 stone:createSurfaceMaterial(THREE,'#c0b9aa','limestone')
};
const cube=new THREE.BoxGeometry(1,1,1);
const roofColours={trade:shared.blue,bank:shared.slate,store:shared.red,forester:shared.moss,home:shared.slate,workshop:shared.red,guard:shared.moss,hall:shared.slate};
const bodyColours={trade:shared.pale,bank:shared.stone,store:shared.plaster,forester:shared.plaster,home:shared.plaster,workshop:shared.stone,guard:shared.stone,hall:shared.stone};
for(const [kind,source] of Object.entries(roofColours))roofFinishes[kind]=createSurfaceMaterial(THREE,source.color,'slate');
function block(g,m,x,y,z,w,h,d,shadow=true){
  const item=new THREE.Mesh(cube,m);item.position.set(x,y,z);item.scale.set(w,h,d);
  item.castShadow=shadow;item.receiveShadow=true;g.add(item);return item;
}
const signCache=new Map();
function makeBuildingNameplate(group,label,y,z){
  if(typeof document==='undefined')return;
  let material=signCache.get(label);
  if(!material){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    ctx.fillStyle='#3e4637';ctx.fillRect(0,0,512,96);
    ctx.fillStyle='#cbb785';ctx.fillRect(8,8,496,80);
    ctx.fillStyle='#2c3229';ctx.fillRect(12,12,488,72);
    ctx.font='bold 35px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#eedbb1';ctx.fillText(label,256,49,465);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    material=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    signCache.set(label,material);
  }
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.84,.52),material);
  panel.position.set(0,y,z);group.add(panel);
}
function transform(build,x,z){
  const angle=FACING[build.face],s=Math.sin(angle),c=Math.cos(angle);
  return {x:build.x+x*c+z*s,z:build.z-x*s+z*c};
}
function wallCollider(build,x,z,w,d,h){
  const world=transform(build,x,z);
  const rotated=build.face==='east'||build.face==='west';
  addWorldObstacle({x:world.x,z:world.z,hx:(rotated?d:w)/2,hz:(rotated?w:d)/2,height:h});
}
const gableMaterials=new Map();
function gableMaterial(kind){
  if(!gableMaterials.has(kind)){
    const base=bodyColours[kind];
    const mat=base.clone();mat.side=THREE.DoubleSide;
    gableMaterials.set(kind,mat);
  }
  return gableMaterials.get(kind);
}
function makeRoof(group,build,h){
  const roof=new THREE.Group();roof.name=build.id+' removable roof';group.add(roof);
  const {w,d,kind}=build,overhang=.48,rise=kind==='trade'?2.24:1.72,run=w/2+overhang;
  const span=Math.hypot(run,rise),slope=Math.atan2(rise,run),depth=d+1.05;
  // Two slopes meet on the exact ridge line; eaves sit at the same height on
  // both sides. Unlike arbitrary rotated cubes there are no open roof seams.
  for(const side of [-1,1]){
    const panel=block(roof,roofFinishes[kind],side*run/2,h+rise/2,0,span+.12,.23,depth);
    panel.rotation.z=-side*slope;
    const fascia=block(roof,shared.trim,side*run,h-.04,0,.16,.17,depth+.06);
    fascia.rotation.z=-side*slope*.15;
    // Small longitudinal timber edging makes the roof read as one structure.
    const end=block(roof,shared.wood,side*(run-.06),h+.08,0,.13,.17,depth+.06);
    end.rotation.z=-side*slope;
  }
  block(roof,shared.trim,0,h+rise+.035,0,.34,.27,depth+.08);
  // Gables close the triangular holes beneath the sloping roof, while the
  // whole upper assembly hides when the player steps indoors.
  const outline=new THREE.Shape();
  outline.moveTo(-w/2,h-.02);outline.lineTo(w/2,h-.02);
  outline.lineTo(0,h+rise);outline.closePath();
  const triangle=new THREE.ShapeGeometry(outline);
  for(const side of [-1,1]){
    const end=new THREE.Mesh(triangle,gableMaterial(kind));
    end.position.z=side*d/2;end.castShadow=true;end.receiveShadow=true;roof.add(end);
    for(const x of [-w*.36,0,w*.36]){
      // Flat gable studs stop at the point where roofline meets the wall.
      const height=rise*(1-Math.abs(x)/(w/2));
      if(height<=.20)continue;
      block(roof,shared.timber,x,h+height/2,side*(d/2+.025),.10,height,.10);
    }
  }
  if(kind==='hall'){
    block(roof,shared.stone,0,h+rise+1.10,-1.4,1.90,2,1.70);
    block(roof,shared.trim,0,h+rise+2.20,-1.4,2.3,.26,2);
    block(roof,shared.gold,0,h+rise+2.57,-1.4,.70,.50,.15);
  }
  if(kind==='bank')block(roof,shared.stone,-w*.30,h+rise+.42,-1,.84,1.4,.86);
  if(kind==='trade')finishTradeHouseRoof(roof,build,h,shared,block);
  roof.traverse(o=>{if(o.isMesh)o.userData.animated=true;});
  return roof;
}
function makeInteriors(group,build){
  const {w,d,kind}=build;
  const floorMaterial=['trade','bank','hall','guard'].includes(kind)?floorFinishes.stone:floorFinishes.wood;
  const floor=block(group,floorMaterial,0,-.095,0,w+.16,.22,d+.16,false);
  floor.name=build.id+' finished interior floor';
  if(kind==='trade'){
    furnishTradeHall(group,build,shared,block,wallCollider);
  }else if(kind==='bank'){
    furnishGrandBank(group,build,shared,block,wallCollider);
  }else if(['store','forester'].includes(kind)){
    // Counter lies behind the reachable front half, with space to walk inside.
    block(group,kind==='bank'?shared.stone:shared.timber,0,1,-1.22,w*.64,1.5,.65);
    block(group,shared.trim,0,1.8,-1.22,w*.66,.18,.79);
    wallCollider(build,0,-1.22,w*.64,.65,1.9);
    for(const x of [-w*.34,w*.34]){
      block(group,shared.wood,x,1.5,-d/2+.57,.64,2.8,.56);
      block(group,shared.trim,x,2.55,-d/2+.20,1,.14,1.15);
    }
    if(kind==='store'){
      for(let i=0;i<4;i++){
        block(group,i%2?shared.moss:shared.red,-w*.28+i*.63,2.06,-d/2+.66,.42,.55,.48);
      }
    }else{
      block(group,shared.moss,0,2.22,-d/2+.52,2.8,.15,.8);
      for(const x of [-.65,.65])block(group,shared.wood,x,2.75,-d/2+.36,.21,.9,.21);
    }
  }else{
    // Homes and workshops are actual interior rooms, not teleport cut-scenes.
    block(group,shared.wood,-w*.24,.43,-d*.25,w*.36,.6,d*.34);
    block(group,shared.cloth,-w*.24,.79,-d*.25,w*.33,.16,d*.28);
    block(group,shared.timber,w*.22,.84,-d*.15,1.7,.2,1.2);
    for(const x of [-.48,.48])block(group,shared.wood,w*.22+x,.43,-d*.15,.18,.8,.18);
    if(kind==='workshop'){
      block(group,shared.stone,w*.20,.64,-d*.27,1.3,1,.7);
      block(group,shared.gold,w*.20,1.26,-d*.27,.5,.15,.42);
    }
    if(kind==='hall'){
      block(group,shared.stone,0,.55,-d*.30,w*.53,1.0,1.25);
      block(group,shared.trim,0,1.12,-d*.30,w*.56,.16,1.37);
      for(const side of [-1,1]){
        block(group,shared.wood,side*w*.31,.46,-.1,1.1,.52,2.5);
        block(group,shared.gold,side*w*.39,2.35,-d*.33,.50,1.7,.12);
      }
    }
    if(kind==='guard'){
      for(const side of [-1,1]){
        block(group,shared.timber,side*w*.32,1.5,-d*.28,.55,2.4,.55);
        block(group,shared.stone,side*w*.32,2.75,-d*.28,.80,.14,.80);
      }
    }
    if(kind==='home'){
      const hearth=block(group,shared.stone,w*.33,.80,-d*.35,1.18,1.3,.7);
      block(group,shared.glow,w*.33,.58,-d*.20,.44,.37,.12,false);
      const shelf=block(group,shared.wood,-w*.30,2.5,-d*.39,1.65,.17,.4);
      for(let i=0;i<5;i++)block(group,i%2?shared.red:shared.blue,-w*.30-.55+i*.27,2.78,-d*.39,.16,.46,.21,false);
    }
  }
  // Warm candle glow, window sills and contrasting wall beams.
  block(group,shared.glow,w*.34,2,-d*.35,.25,.38,.21,false);
  block(group,shared.timber,-w/2+.26,2.2,0,.27,3.9,.27);
  block(group,shared.timber,w/2-.26,2.2,0,.27,3.9,.27);
}
function decorateFacade(group,build,h){
  const {w,d,kind}=build;
  // Open doorway: there is deliberately NO solid door mesh.
  block(group,shared.trim,0,3.31,d/2+.22,3.1,.22,.42);
  for(const side of [-1,1]){
    block(group,shared.timber,side*1.54,1.68,d/2+.23,.19,3.35,.24);
    const wx=side*(w/2-.91),wy=h*.52;
    const pane=block(group,shared.glass,wx,wy,d/2+.02,1.01,1.04,.08,false);
    pane.name=build.id+' recessed window';
    for(const delta of [-.57,.57])block(group,shared.timber,wx+delta,wy,d/2+.28,.12,1.28,.22);
    for(const delta of [-.63,.63])block(group,shared.timber,wx,wy+delta,d/2+.28,1.27,.13,.23);
    block(group,shared.timber,wx,wy,d/2+.32,.07,1.20,.085,false);
    block(group,shared.timber,wx,wy,d/2+.32,1.17,.065,.085,false);
    block(group,shared.trim,wx,wy-.71,d/2+.50,1.52,.16,.51);
    block(group,shared.pale,wx,wy+.71,d/2+.30,1.48,.21,.40);
    // Shutters are fixed to the masonry, not floating above the window.
    for(const sx of [-1,1])block(group,shared.wood,wx+sx*.78,wy,d/2+.25,.34,1.17,.16);
  }
  const plaque=block(group,kind==='bank'?shared.gold:kind==='store'?shared.red:kind==='forester'?shared.moss:shared.trim,0,h+.20,d/2+.28,3,.52,.23);
  const labels={trade:'OAKREST TRADE HOUSE',bank:'OAKREST BANK',store:'GENERAL STORE',forester:'FORESTER',hall:"WARDEN'S HALL",workshop:'WORKSHOP',guard:'CITY WATCH'};
  if(labels[kind])makeBuildingNameplate(group,labels[kind],h+.21,d/2+.45);
  if(kind==='trade'){
    finishTradeHouseFacade(group,build,h,shared,block,wallCollider);
  }else if(kind==='bank'){
    buildGrandBankFacade(group,build,h,shared,block,wallCollider);
  }else if(kind==='store'){
    for(let i=-3;i<=3;i++)block(group,i%2?shared.red:shared.cloth,i*.47,3.33,d/2+.85,.46,.28,1.4);
  }else if(kind==='forester'){
    const a=block(group,shared.pale,-.20,h+.97,d/2+.38,.13,1.1,.17);
    const b=block(group,shared.pale,.20,h+.97,d/2+.38,.13,1.1,.17);
    a.rotation.z=.65;b.rotation.z=-.65;
  }else plaque.scale.x*=.55;
}
// Collapse decorative cutaway cubes into a handful of material buckets PER
// wall. They remain individually togglable by wall side while staying cheap
// enough for iPad Safari; named interactable/unique meshes are left intact.
function optimizeCutawayMeshes(group,cutaway){
 for(const [side,items] of Object.entries(cutaway)){
  const buckets=new Map();
  for(const mesh of items){
   if(!mesh.isMesh||mesh.name||mesh.material.transparent||mesh.geometry.type!=='BoxGeometry')continue;
   const key=mesh.material.uuid+':'+mesh.castShadow;
   if(!buckets.has(key))buckets.set(key,[]);
   buckets.get(key).push(mesh);
  }
  const deleted=new Set(),added=[];
  for(const meshes of buckets.values()){
   if(meshes.length<3)continue;
   const geometries=meshes.map(mesh=>{
    mesh.updateMatrix();
    const geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrix);return geometry;
   });
   const geometry=mergeGeometries(geometries);
   for(const g of geometries)g.dispose();
   if(!geometry)continue;
   const merged=new THREE.Mesh(geometry,meshes[0].material);
   merged.castShadow=meshes[0].castShadow;merged.receiveShadow=true;
   merged.userData.animated=true;merged.userData.cutawaySide=side;
   group.add(merged);added.push(merged);
   for(const mesh of meshes){mesh.removeFromParent();deleted.add(mesh);}
  }
  cutaway[side]=[...items.filter(mesh=>!deleted.has(mesh)),...added];
 }
}
function buildHouse(scene,build){
  const g=new THREE.Group();
  g.position.set(build.x,terrainHeight(build.x,build.z),build.z);
  g.rotation.y=FACING[build.face];scene.add(g);
  const {w,d,kind}=build,h=kind==='trade'?6.55:kind==='bank'?6.05:['store','forester','hall'].includes(kind)?5.15:4.15;
  const wall=.36,opening=3.15,edge=(w-opening)/2;
  // These meshes MUST stay separate when static scenery is batched; a player
  // looking into a room needs an unobstructed cutaway, not solid walls.
  const cutaway={front:[],back:[],left:[],right:[]};
  const mark=(mesh,side)=>{mesh.userData.animated=true;mesh.userData.cutawaySide=side;cutaway[side].push(mesh);return mesh;};
  const base=bodyColours[kind];
  // Four physical walls with a front opening. These shape meshes and collision
  // prisms agree, so the hero walks through the opening and stops at the walls.
  const rearWall=mark(block(g,base,0,h/2,-d/2,w,h,wall),'back');
  rearWall.name=build.id+' rear structural wall';
  wallCollider(build,0,-d/2,w,wall,h);
  for(const side of [-1,1]){
    mark(block(g,base,side*w/2,h/2,0,wall,h,d),side<0?'left':'right');
    wallCollider(build,side*w/2,0,wall,d,h);
    const px=side*(opening/2+edge/2);
    // Solid collider retains the facade shape; the visible stone/plaster now
    // has a true window recess instead of a glass decal on an unbroken wall.
    const apertureCenter=w/2-.91,apertureWidth=1.06;
    const windowBottom=h*.52-.55,windowTop=h*.52+.55;
    const lo=opening/2,hi=w/2;
    const a=apertureCenter-apertureWidth/2,b=apertureCenter+apertureWidth/2;
    for(const [left,right] of [[lo,a],[b,hi]]){
      const width=right-left;
      if(width>.01)mark(block(g,base,side*(left+right)/2,h/2,d/2,width+.025,h,wall),'front');
    }
    mark(block(g,base,side*apertureCenter,windowBottom/2,d/2,apertureWidth+.045,windowBottom,wall),'front');
    mark(block(g,base,side*apertureCenter,(windowTop+h)/2,d/2,apertureWidth+.045,h-windowTop,wall),'front');
    wallCollider(build,px,d/2,edge,wall,h);
    mark(block(g,shared.trim,side*(w/2-.19),h*.52,0,.18,h*.9,d+.25),side<0?'left':'right');
  }
  // Finish the *entire* wall above the working doorway. The old fixed .70m
  // cap ended at h-.70: that left open holes of up to 2.65m between the door
  // trim (y=3.2) and roof on tall Bank/Trade/Shop/Forester/Hall facades.
  // A continuous real structural mesh, not decorative trim or a collider,
  // spans from the 3.15m clear opening to the roofline on ALL 16 buildings.
  // The slight roof and lintel overlap closes bright seams at either join.
  const clearDoorHeight=3.15,roofOverlap=.04;
  const upperFacade=mark(block(g,base,0,
    (clearDoorHeight+h+roofOverlap)/2,d/2,
    opening+.035,h-clearDoorHeight+roofOverlap,wall+.035),'front');
  upperFacade.name=build.id+' completed doorway header';
  // Continuous masonry course along the foot of every wall; cut out the
  // actual doorway so the hero never steps across an invisible solid block.
  const footing=.42;
  block(g,shared.stone,0,footing/2,-d/2,w+.16,footing,.55);
  for(const side of [-1,1]){
    block(g,shared.stone,side*w/2,footing/2,0,.54,footing,d+.22);
    block(g,shared.stone,side*(opening/2+edge/2),footing/2,d/2,edge,footing,.55);
    block(g,shared.trim,side*(w/2-.14),h/2,0,.13,h-.46,.13);
  }
  // Interior floor and porch share a level terrain foundation with the real
  // gameplay ground (not a high floating platform hiding grass beneath it).
  block(g,shared.stone,0,-.10,0,w+.16,.20,d+.16,false);
  block(g,shared.stone,0,-.045,d/2+.45,opening-.12,.15,.95,false);
  block(g,shared.trim,0,.035,d/2+.27,opening-.08,.06,.22,false);
  // Above-door lintel must not seal the player-height doorway.
  const facadeStart=g.children.length;
  decorateFacade(g,build,h);
  for(const piece of g.children.slice(facadeStart))mark(piece,'front');
  for(const {mesh,side} of addArchitecturalFinish(g,build,h,shared))mark(mesh,side);
  makeInteriors(g,build);
  furnishDistinctInterior(g,build,shared);
  const roof=makeRoof(g,build,h);
  optimizeCutawayMeshes(g,cutaway);
  return {build,roof,cutaway};
}
function buildMerchantWell(scene){
  const {x,z,r,roofRadius,courtyardRadius}=OAKREST_WELL;
  const group=new THREE.Group();
  group.name='Merchant Quarter Well';
  group.userData.townFixture='well';
  group.position.set(x,terrainHeight(x,z),z);
  scene.add(group);
  // Terrain-following paving leaves no hovering circular slab and keeps a
  // clear approach from both of the surrounding pedestrian streets.
  const pave=new THREE.CircleGeometry(courtyardRadius,32);
  pave.rotateX(-Math.PI/2);
  const pos=pave.getAttribute('position');
  for(let i=0;i<pos.count;i++){
    const dx=pos.getX(i),dz=pos.getZ(i);
    pos.setY(i,terrainHeight(x+dx,z+dz)-group.position.y+.045);
  }
  pave.computeVertexNormals();
  const courtyard=new THREE.Mesh(pave,shared.dirt);
  courtyard.name='Well cobblestone courtyard';
  courtyard.receiveShadow=true;group.add(courtyard);
  const basin=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.85,18),shared.stone);
  basin.position.y=.40;basin.castShadow=true;basin.receiveShadow=true;group.add(basin);
  const trim=new THREE.Mesh(new THREE.TorusGeometry(r-.12,.16,8,24),shared.pale);
  trim.rotation.x=Math.PI/2;trim.position.y=.88;group.add(trim);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(r-.30,r-.30,.055,18),shared.dark);
  water.position.y=.85;group.add(water);
  for(const xx of [-r+.18,r-.18])block(group,shared.wood,xx,1.94,0,.24,2.65,.24);
  block(group,shared.timber,0,3.34,0,roofRadius*2.05,.22,3.4);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(roofRadius,1.45,4),shared.moss);
  cap.position.y=4.10;cap.rotation.y=Math.PI/4;cap.castShadow=true;group.add(cap);
  addWorldObstacle({x,z,r,height:4.8});
  // Narrow, walkable stepping stones link the two quieter side streets to
  // the dedicated circular court. Unlike the old 5.4m-wide road spurs, they
  // never run underneath the well or turn its entire apron into a road.
  const stoneGeometry=new THREE.CircleGeometry(.39,12);
  stoneGeometry.rotateX(-Math.PI/2);
  for(const [px,pz] of OAKREST_WELL_STEPS){
    const stone=new THREE.Mesh(stoneGeometry,shared.pale);
    stone.name='Well approach stepping stone';
    stone.position.set(px,terrainHeight(px,pz)+.07,pz);
    stone.receiveShadow=true;
    scene.add(stone);
  }
}
export function buildOakrestTown(scene){
  // Finished hand-laid paving uses the same geometry and route layout as the
  // old roads. Its visual detail creates no collision or pathfinding changes.
  const cityPaths=buildOakrestCityPaths(scene);
  const buildings=OAKREST_BUILDINGS.map(b=>buildHouse(scene,b));
  const cityIdentity=buildCityIdentity(scene);
  // Historic Heartwood Square is built in city-identity.js. The broad ancient
  // oak trunk uses a matching collision footprint with a passable paved ring.
  addWorldObstacle({x:0,z:39,r:2.2,height:15});
  buildMerchantWell(scene);
  // Market stalls sit in deliberate setbacks, not on a paved travel lane.
  for(const {x,z,colour} of OAKREST_MARKET_STALLS){
    const canopy={red:shared.red,blue:shared.blue,moss:shared.moss}[colour];
    const stall=new THREE.Group();stall.position.set(x,terrainHeight(x,z),z);scene.add(stall);
    block(stall,shared.timber,0,1,0,3.5,.25,2.3);
    for(const sx of [-1,1])for(const sz of [-1,1])block(stall,shared.wood,sx*1.47,1.4,sz*.92,.18,2.8,.18);
    block(stall,canopy,0,2.98,0,4.1,.26,2.7);
    for(let i=0;i<4;i++)block(stall,i%2?shared.moss:shared.gold,-1.08+i*.7,1.27,.12,.35,.25,.45,false);
    addWorldObstacle({x,z,hx:1.7,hz:1.15,height:3.1});
  }
  // The outer city wall and the limestone gates are built in city-identity.
  // Keep only the joined south curtain sections that reach those gate towers.
  // The earlier timber fence, posts and second arch were visually doubled and
  // obstructed otherwise usable garden and arrival paths.
  for(const x of [-25,25]){
    const curtain=new THREE.Group();
    curtain.name='Southgate curtain wall';
    curtain.position.set(x,terrainHeight(x,-13),-13);
    scene.add(curtain);
    block(curtain,shared.stone,0,2.05,0,38,4.1,1.0);
    block(curtain,shared.pale,0,4.33,0,38,.46,1.25);
    for(let off=-17;off<=17;off+=2.4)
      block(curtain,shared.stone,off,4.9,0,1.04,.66,1.30);
    addWorldObstacle({x,z:-13,hx:19,hz:.58,height:5});
  }
  // Harvestable village trees are now created by the Woodcutting controller,
  // which owns their falling meshes, depletion and removable colliders.
  // Lanterns mark the road towards the first safe adventure.
  for(const z of [-18,-27,-37,-46])for(const x of [-5.8,5.8]){
    const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);scene.add(g);
    block(g,shared.wood,0,1.45,0,.17,2.9,.17);
    block(g,shared.gold,0,2.98,0,.48,.42,.48);
  }
  // Ground cover comes last: all permanent stalls, buildings and walls have
  // registered their colliders before sampling safe green land.
  const cityMeadows=buildOakrestCityMeadows(scene);
  return {
    buildings:buildings.length,services:OAKREST_SERVICES.length,groves:OAKREST_GROVES.length,
    groundFinish:{pavingStones:cityPaths.stoneCount,grassTufts:cityMeadows.grassCount,wildflowers:cityMeadows.flowerCount},
    districts:CITY_DISTRICTS,landmark:cityIdentity.landmark,ambientCount:cityIdentity.ambientCount,
    update(player,time=0,camera=null){
      cityIdentity.update(time,player);
      for(const {build,roof,cutaway} of buildings){
        const state=buildingCutaway(build,player,camera);
        roof.visible=!state.active;
        for(const [side,meshes] of Object.entries(cutaway)){
          const visible=!state.active||!state.hidden.includes(side);
          for(const mesh of meshes)mesh.visible=visible;
        }
      }
    },
    interior(x,z){return buildings.find(({build})=>playerInBuilding(build,x,z))?.build||null;},
    inside(x,z){return buildings.find(({build})=>playerInBuilding(build,x,z))?.build.id||null;}
  };
}
