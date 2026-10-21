import * as THREE from 'three';
import {terrainHeight,addWorldObstacle} from './terrain.js';
import {OAKREST_SERVICES,OAKREST_GROVES} from './town-services.js';
import {buildCityIdentity,CITY_DISTRICTS} from './city-identity.js';
import {furnishGrandBank,buildGrandBankFacade} from './bank-architecture.js';

/**
 * Walkable starter town. Every building has a real doorway, four separate
 * collidable walls and an interior; roofs lift away while the player is inside.
 * Building orientation is independent of door and service interaction rules.
 */
import {OAKREST_BUILDINGS,OAKREST_PATHS,FACING,localBuildingPosition,OAKREST_WELL,OAKREST_WELL_STEPS,OAKREST_MARKET_STALLS,roadCrossSections} from './town-layout.js';
export {OAKREST_BUILDINGS,OAKREST_PATHS} from './town-layout.js';
const shared={
  plaster:new THREE.MeshLambertMaterial({color:'#d1c4a6'}),
  stone:new THREE.MeshLambertMaterial({color:'#939b8b'}),
  pale:new THREE.MeshLambertMaterial({color:'#b7b9a5'}),
  timber:new THREE.MeshLambertMaterial({color:'#72523a'}),
  wood:new THREE.MeshLambertMaterial({color:'#553e31'}),
  trim:new THREE.MeshLambertMaterial({color:'#c49f68'}),
  slate:new THREE.MeshLambertMaterial({color:'#526d75'}),
  moss:new THREE.MeshLambertMaterial({color:'#597760'}),
  red:new THREE.MeshLambertMaterial({color:'#955f50'}),
  blue:new THREE.MeshLambertMaterial({color:'#758e9a'}),
  gold:new THREE.MeshLambertMaterial({color:'#dfbb69'}),
  cloth:new THREE.MeshLambertMaterial({color:'#b29576'}),
  dirt:new THREE.MeshLambertMaterial({color:'#ac9774'}),
  dark:new THREE.MeshLambertMaterial({color:'#343c39'}),
  glass:new THREE.MeshLambertMaterial({color:'#a4c4c0',transparent:true,opacity:.7}),
  glow:new THREE.MeshBasicMaterial({color:'#ffd58e'})
};
// Draw lightweight original architectural surface patterns once. This avoids
// hundreds of separate shingle and plank meshes on iPad Safari.
function surfacePattern(type){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');
 canvas.width=256;canvas.height=256;
 const c=canvas.getContext('2d');
 if(!c)return null;
 c.fillStyle='#f3f0e8';c.fillRect(0,0,256,256);
 if(type==='roof'){
  for(let row=0;row<8;row++){
   const y=row*32;
   c.fillStyle=row%2?'#e8e8e5':'#f5f3ec';c.fillRect(0,y,256,32);
   c.fillStyle='rgba(28,36,33,.25)';c.fillRect(0,y+29,256,3);
   const offset=row%2?16:0;
   for(let x=offset-32;x<288;x+=64){
    c.fillRect(x,y,2,30);
    c.fillStyle='rgba(255,255,255,.16)';c.fillRect(x+5,y+3,44,2);
    c.fillStyle='rgba(28,36,33,.25)';
   }
  }
 }else if(type==='planks'){
  c.fillStyle='#d3c1a2';c.fillRect(0,0,256,256);
  for(let row=0;row<8;row++){
   const y=row*32;
   c.fillStyle=row%2?'#a98d6c':'#c7a986';
   c.fillRect(0,y+30,256,2);
   for(let x=(row%2?38:0);x<256;x+=100){
    c.fillRect(x,y,2,30);
    c.fillStyle='rgba(255,255,255,.21)';c.fillRect(x+7,y+6,46,1);
    c.fillStyle=row%2?'#a98d6c':'#c7a986';
   }
  }
 }else{
  c.fillStyle='#d7d1c1';c.fillRect(0,0,256,256);
  c.strokeStyle='rgba(80,78,72,.24)';c.lineWidth=2;
  for(let row=0;row<8;row++){
   const y=row*32;c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();
   for(let x=(row%2?32:0);x<256;x+=64){
    c.beginPath();c.moveTo(x,y);c.lineTo(x,y+32);c.stroke();
   }
  }
 }
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;
 tex.repeat.set(type==='roof'?1:2,2);
 tex.anisotropy=4;
 return tex;
}
const roofPattern=surfacePattern('roof'),plankPattern=surfacePattern('planks'),stonePattern=surfacePattern('stone');
const roofFinishes={};
const floorFinishes={
  wood:new THREE.MeshLambertMaterial({color:'#e3d1b2',map:plankPattern}),
  stone:new THREE.MeshLambertMaterial({color:'#c0b9aa',map:stonePattern})
};
const cube=new THREE.BoxGeometry(1,1,1);
const roofColours={bank:shared.slate,store:shared.red,forester:shared.moss,home:shared.slate,workshop:shared.red,guard:shared.moss,hall:shared.slate};
const bodyColours={bank:shared.stone,store:shared.plaster,forester:shared.plaster,home:shared.plaster,workshop:shared.stone,guard:shared.stone,hall:shared.stone};
for(const [kind,source] of Object.entries(roofColours))roofFinishes[kind]=new THREE.MeshLambertMaterial({color:source.color,map:roofPattern});
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
function makeRoad(scene,segments,width,color,offset){
  const verts=[],colours=[],indices=[],tint=new THREE.Color(color);
  const add=(x,z)=>{
    verts.push(x,terrainHeight(x,z)+offset,z);
    const n=1+Math.sin(x*.81+z*1.37)*.045;
    colours.push(tint.r*n,tint.g*n,tint.b*n);
  };
  for(const route of segments){
    const sections=roadCrossSections(route,width);
    for(let k=1;k<route.length;k++){
      const [ax,az]=route[k-1],[bx,bz]=route[k],len=Math.hypot(bx-ax,bz-az);
      const steps=Math.max(1,Math.ceil(len/1.2)),start=sections[k-1],end=sections[k];
      for(let i=0;i<steps;i++){
        const t=i/steps,u=(i+1)/steps,base=verts.length/3;
        const interpolate=(p,q,v)=>[p[0]+(q[0]-p[0])*v,p[1]+(q[1]-p[1])*v];
        const l1=interpolate(start.left,end.left,t),r1=interpolate(start.right,end.right,t);
        const l2=interpolate(start.left,end.left,u),r2=interpolate(start.right,end.right,u);
        add(...l1);add(...r1);add(...l2);add(...r2);
        indices.push(base,base+1,base+2,base+1,base+3,base+2);
      }
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const road=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,depthWrite:true}));
  road.receiveShadow=true;scene.add(road);
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
  const {w,d,kind}=build,overhang=.48,rise=1.72,run=w/2+overhang;
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
  roof.traverse(o=>{if(o.isMesh)o.userData.animated=true;});
  return roof;
}
function makeInteriors(group,build){
  const {w,d,kind}=build;
  const floorMaterial=['bank','hall','guard'].includes(kind)?floorFinishes.stone:floorFinishes.wood;
  const floor=block(group,floorMaterial,0,-.095,0,w+.16,.22,d+.16,false);
  floor.name=build.id+' finished interior floor';
  if(kind==='bank'){
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
  const labels={bank:'OAKREST BANK',store:'GENERAL STORE',forester:'FORESTER',hall:"WARDEN'S HALL",workshop:'WORKSHOP',guard:'CITY WATCH'};
  if(labels[kind])makeBuildingNameplate(group,labels[kind],h+.21,d/2+.45);
  if(kind==='bank'){
    buildGrandBankFacade(group,build,h,shared,block,wallCollider);
  }else if(kind==='store'){
    for(let i=-3;i<=3;i++)block(group,i%2?shared.red:shared.cloth,i*.47,3.33,d/2+.85,.46,.28,1.4);
  }else if(kind==='forester'){
    const a=block(group,shared.pale,-.20,h+.97,d/2+.38,.13,1.1,.17);
    const b=block(group,shared.pale,.20,h+.97,d/2+.38,.13,1.1,.17);
    a.rotation.z=.65;b.rotation.z=-.65;
  }else plaque.scale.x*=.55;
}
function buildHouse(scene,build){
  const g=new THREE.Group();
  g.position.set(build.x,terrainHeight(build.x,build.z),build.z);
  g.rotation.y=FACING[build.face];scene.add(g);
  const {w,d,kind}=build,h=kind==='bank'?6.05:['store','forester','hall'].includes(kind)?5.15:4.15;
  const wall=.36,opening=3.15,edge=(w-opening)/2;
  const base=bodyColours[kind];
  // Four physical walls with a front opening. These shape meshes and collision
  // prisms agree, so the hero walks through the opening and stops at the walls.
  block(g,base,0,h/2,-d/2,w,h,wall);
  wallCollider(build,0,-d/2,w,wall,h);
  for(const side of [-1,1]){
    block(g,base,side*w/2,h/2,0,wall,h,d);
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
      if(width>.01)block(g,base,side*(left+right)/2,h/2,d/2,width+.025,h,wall);
    }
    block(g,base,side*apertureCenter,windowBottom/2,d/2,apertureWidth+.045,windowBottom,wall);
    block(g,base,side*apertureCenter,(windowTop+h)/2,d/2,apertureWidth+.045,h-windowTop,wall);
    wallCollider(build,px,d/2,edge,wall,h);
    block(g,shared.trim,side*(w/2-.19),h*.52,0,.18,h*.9,d+.25);
  }
  block(g,base,0,h-.35,d/2,opening,.70,wall);
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
  decorateFacade(g,build,h);
  makeInteriors(g,build);
  const roof=makeRoof(g,build,h);
  return {build,roof};
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
  makeRoad(scene,OAKREST_PATHS,5.4,'#86795f',.018);
  makeRoad(scene,OAKREST_PATHS,4.35,'#b49c75',.034);
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
  for(const tree of OAKREST_GROVES){
    const g=new THREE.Group();g.position.set(tree.x,terrainHeight(tree.x,tree.z),tree.z);scene.add(g);
    block(g,shared.wood,0,1.75,0,.67,3.5,.67);
    for(const [xx,yy,zz,scale] of [[0,4,0,1],[.6,3.45,-.1,.7],[-.6,3.55,.1,.72]]){
      const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1.42*scale,1),shared.moss);
      m.position.set(xx,yy,zz);m.castShadow=true;g.add(m);
    }
    addWorldObstacle({x:tree.x,z:tree.z,r:.5,height:4});
  }
  // Lanterns mark the road towards the first safe adventure.
  for(const z of [-18,-27,-37,-46])for(const x of [-5.8,5.8]){
    const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);scene.add(g);
    block(g,shared.wood,0,1.45,0,.17,2.9,.17);
    block(g,shared.gold,0,2.98,0,.48,.42,.48);
  }
  return {
    buildings:buildings.length,services:OAKREST_SERVICES.length,groves:OAKREST_GROVES.length,
    districts:CITY_DISTRICTS,landmark:cityIdentity.landmark,ambientCount:cityIdentity.ambientCount,
    update(player,time=0){
      cityIdentity.update(time,player);
      for(const {build,roof} of buildings){
        const {x:localX,z:localZ}=localBuildingPosition(build,player.x,player.z);
        roof.visible=!(Math.abs(localX)<build.w*.48&&Math.abs(localZ)<build.d*.48);
      }
    },
    inside(x,z){return buildings.find(({build})=>{
      const p=localBuildingPosition(build,x,z);
      return Math.abs(p.x)<build.w*.48&&Math.abs(p.z)<build.d*.48;
    })?.build.id||null;}
  };
}
