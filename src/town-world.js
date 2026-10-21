import * as THREE from 'three';
import {terrainHeight,addWorldObstacle} from './terrain.js';
import {OAKREST_SERVICES,OAKREST_GROVES} from './town-services.js';

/**
 * Walkable starter town. Every building has a real doorway, four separate
 * collidable walls and an interior; roofs lift away while the player is inside.
 * Building orientation is independent of door and service interaction rules.
 */
export const OAKREST_BUILDINGS=Object.freeze([
  {id:'bank',x:-30,z:14,w:10,d:9,face:'east',kind:'bank'},
  {id:'store',x:30,z:14,w:10,d:9,face:'west',kind:'store'},
  {id:'forester',x:-30,z:46,w:11,d:9,face:'east',kind:'forester'},
  {id:'cottage-a',x:-14,z:12,w:8,d:7,face:'east',kind:'home'},
  {id:'cottage-b',x:14,z:8,w:8,d:7,face:'west',kind:'home'},
  {id:'cottage-c',x:-14,z:28,w:8,d:7,face:'east',kind:'home'},
  {id:'cottage-d',x:14,z:27,w:8,d:7,face:'west',kind:'home'},
  {id:'north-home',x:29,z:42,w:8,d:7,face:'west',kind:'home'},
  {id:'north-workshop',x:29,z:58,w:8,d:7,face:'north',kind:'workshop'},
  {id:'west-house',x:-29,z:-2,w:8,d:7,face:'east',kind:'home'},
  {id:'east-guardhouse',x:29,z:-2,w:8,d:7,face:'west',kind:'guard'}
]);
export const OAKREST_PATHS=Object.freeze([
  [[0,-13],[0,29]], [[-4.6,29],[-4.6,50]], [[4.6,29],[4.6,50]], [[0,50],[0,69]],
  [[0,20],[-23,20],[-23,14]], [[0,17],[23,17],[24.4,14]],
  [[-4.6,46],[-24.4,46]], [[4.6,42],[24.4,42]],
  [[0,12],[-9.4,12]], [[0,8],[9.4,8]], [[0,28],[-9.4,28]], [[0,27],[9.4,27]],
  [[0,0],[-24.4,0],[-24.4,-2]], [[0,-3],[24.4,-3],[24.4,-2]],
  [[4.6,54],[20,54],[29,54.4]],
  [[-4.6,57],[-13,57]]
]);
const FACING={north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2};
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
const cube=new THREE.BoxGeometry(1,1,1);
const roofColours={bank:shared.slate,store:shared.red,forester:shared.moss,home:shared.slate,workshop:shared.red,guard:shared.moss};
const bodyColours={bank:shared.stone,store:shared.plaster,forester:shared.plaster,home:shared.plaster,workshop:shared.stone,guard:shared.stone};
function block(g,m,x,y,z,w,h,d,shadow=true){
  const item=new THREE.Mesh(cube,m);item.position.set(x,y,z);item.scale.set(w,h,d);
  item.castShadow=shadow;item.receiveShadow=true;g.add(item);return item;
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
  for(const route of segments)for(let k=1;k<route.length;k++){
    const [ax,az]=route[k-1],[bx,bz]=route[k],len=Math.hypot(bx-ax,bz-az);
    const steps=Math.max(1,Math.ceil(len/1.2)),px=-(bz-az)/len*width/2,pz=(bx-ax)/len*width/2;
    for(let i=0;i<steps;i++){
      const a=i/steps,b=(i+1)/steps,base=verts.length/3;
      const x1=ax+(bx-ax)*a,z1=az+(bz-az)*a,x2=ax+(bx-ax)*b,z2=az+(bz-az)*b;
      add(x1+px,z1+pz);add(x1-px,z1-pz);add(x2+px,z2+pz);add(x2-px,z2-pz);
      indices.push(base,base+1,base+2,base+1,base+3,base+2);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const road=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,depthWrite:true}));
  road.receiveShadow=true;scene.add(road);
}
function makeRoof(group,build,h){
  const roof=new THREE.Group();group.add(roof);
  const w=build.w,d=build.d;
  for(const s of [-1,1]){
    const half=block(roof,roofColours[build.kind],s*w*.25,h+.72,0,w*.55,.24,d+1.2);
    half.rotation.z=-s*.38;
    block(roof,shared.wood,s*(w*.49),h+.35,0,.08,.1,d+1.28,false);
  }
  block(roof,shared.trim,0,h+1.73,0,.25,.24,d+1.3);
  if(build.kind==='bank')block(roof,shared.stone,-w*.30,h+1.4,-1,.9,1.8,.9);
  return roof;
}
function makeInteriors(group,build){
  const {w,d,kind}=build;
  block(group,shared.wood,0,.08,0,w-.45,.16,d-.45,false);
  for(let i=0;i<Math.floor(w-1);i++){
    const x=-w/2+.75+i*.96;
    block(group,shared.cloth,x,.176,0,.035,.025,d-.7,false);
  }
  if(['bank','store','forester'].includes(kind)){
    // Counter lies behind the reachable front half, with space to walk inside.
    block(group,kind==='bank'?shared.stone:shared.timber,0,1,-1.22,w*.64,1.5,.65);
    block(group,shared.trim,0,1.8,-1.22,w*.66,.18,.79);
    for(const x of [-w*.34,w*.34]){
      block(group,shared.wood,x,1.5,-d/2+.57,.64,2.8,.56);
      block(group,shared.trim,x,2.55,-d/2+.20,1,.14,1.15);
    }
    if(kind==='bank'){
      // Vault door and coin piles identify the bank from inside.
      block(group,shared.stone,0,1.7,-d/2+.18,2.1,2.9,.22);
      const dial=new THREE.Mesh(new THREE.TorusGeometry(.54,.13,8,14),shared.gold);
      dial.position.set(0,1.76,-d/2+.38);group.add(dial);
    }else if(kind==='store'){
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
    block(group,shared.timber,side*(w/2-.75),h*.52,d/2+.22,.85,1.20,.16);
    block(group,shared.glass,side*(w/2-.75),h*.52,d/2+.32,.57,.90,.07,false);
    block(group,shared.trim,side*(w/2-.75),h*.52,d/2+.42,.74,.10,.16);
  }
  const plaque=block(group,kind==='bank'?shared.gold:kind==='store'?shared.red:kind==='forester'?shared.moss:shared.trim,0,h+.20,d/2+.28,3,.52,.23);
  if(kind==='bank'){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.14,8,18),shared.gold);
    ring.position.set(0,h+.99,d/2+.33);group.add(ring);
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
  const {w,d,kind}=build,h=['bank','store','forester'].includes(kind)?5.15:4.15;
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
    block(g,base,px,h/2,d/2,edge,h,wall);
    wallCollider(build,px,d/2,edge,wall,h);
    block(g,shared.trim,side*(w/2-.19),h*.52,0,.18,h*.9,d+.25);
  }
  block(g,base,0,h-.35,d/2,opening,.70,wall);
  // Above-door lintel must not seal the player-height doorway.
  decorateFacade(g,build,h);
  makeInteriors(g,build);
  const roof=makeRoof(g,build,h);
  return {build,roof};
}
export function buildOakrestTown(scene){
  makeRoad(scene,OAKREST_PATHS,5.4,'#86795f',.018);
  makeRoad(scene,OAKREST_PATHS,4.35,'#b49c75',.034);
  const buildings=OAKREST_BUILDINGS.map(b=>buildHouse(scene,b));
  // Historic central square, deliberately walkable on both sides of the well.
  const plaza=new THREE.Group();plaza.position.set(0,terrainHeight(0,39),39);scene.add(plaza);
  block(plaza,shared.dirt,0,.015,0,15,.025,12,false);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(2.06,2.18,1.20,12),shared.stone);
  rim.position.set(0,.60,0);rim.castShadow=true;plaza.add(rim);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.65,.06,12),shared.dark);
  water.position.set(0,1.23,0);plaza.add(water);
  for(const x of [-1.7,1.7])block(plaza,shared.timber,x,2.5,0,.2,3.2,.23);
  block(plaza,shared.moss,0,4.1,0,4.3,.26,3.1);
  addWorldObstacle({x:0,z:39,r:2.2,height:4.4});
  // Distinct market corners outside the pedestrian path.
  for(const [x,z,colour] of [[-9,43,shared.red],[9,49,shared.blue],[9,17,shared.moss]]){
    const stall=new THREE.Group();stall.position.set(x,terrainHeight(x,z),z);scene.add(stall);
    block(stall,shared.timber,0,1,0,3.5,.25,2.3);
    for(const sx of [-1,1])for(const sz of [-1,1])block(stall,shared.wood,sx*1.47,1.4,sz*.92,.18,2.8,.18);
    block(stall,colour,0,2.98,0,4.1,.26,2.7);
    for(let i=0;i<4;i++)block(stall,i%2?shared.moss:shared.gold,-1.08+i*.7,1.27,.12,.35,.25,.45,false);
    addWorldObstacle({x,z,hx:1.7,hz:1.15,height:3.1});
  }
  for(const x of [-42,42]){
    for(let z=-9;z<=63;z+=4.5){
      const p=new THREE.Group();p.position.set(x,terrainHeight(x,z),z);scene.add(p);
      block(p,shared.wood,0,2.25,0,.55,4.5,.55);
      block(p,shared.trim,0,4.55,0,.73,.24,.73);
    }
    const p=new THREE.Group();p.position.set(x,terrainHeight(x,27),27);scene.add(p);
    block(p,shared.timber,0,1.8,0,.24,3.6,72);
    addWorldObstacle({x,z:27,hx:.3,hz:36,height:4.8});
  }
  for(const [x,w] of [[-24,35],[24,35]]){
    const p=new THREE.Group();p.position.set(x,terrainHeight(x,-13),-13);scene.add(p);
    block(p,shared.timber,0,1.7,0,w,3.4,.45);
    addWorldObstacle({x,z:-13,hx:w*.5,hz:.3,height:3.5});
  }
  for(const x of [-5.2,5.2]){
    const p=new THREE.Group();p.position.set(x,terrainHeight(x,-13),-13);scene.add(p);
    block(p,shared.stone,0,2.3,0,.9,4.6,.9);
  }
  const gate=new THREE.Group();gate.position.set(0,terrainHeight(0,-13),-13);scene.add(gate);
  block(gate,shared.trim,0,4.65,0,11,.55,.9);
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
    update(player){
      for(const {build,roof} of buildings){
        const {x,z}=player,dx=x-build.x,dz=z-build.z,angle=FACING[build.face];
        const localX=dx*Math.cos(angle)-dz*Math.sin(angle),localZ=dx*Math.sin(angle)+dz*Math.cos(angle);
        roof.visible=!(Math.abs(localX)<build.w*.48&&Math.abs(localZ)<build.d*.48);
      }
    },
    inside(x,z){return buildings.find(({build})=>{
      const a=FACING[build.face],dx=x-build.x,dz=z-build.z;
      return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<build.w*.48&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<build.d*.48;
    })?.build.id||null;}
  };
}
