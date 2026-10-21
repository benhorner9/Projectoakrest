import * as THREE from 'three';
import {createSurfaceMaterial} from './visual-fidelity.js';
import {terrainHeight,addWorldObstacle} from './terrain.js';
import {OAKREST_GARDEN_BENCHES,OAKREST_SQUARE_BENCHES,OAKREST_TRADE_TABLES,OAKREST_CITY_LAMPS,OAKREST_SIGNPOSTS} from './town-layout.js';

/**
 * The Heartwood city art pass: original procedural architecture and landscape.
 * No network art, no copied map, no per-frame mesh allocation. Material/geometry
 * sharing keeps decorative content affordable in Safari.
 */
export const CITY_DISTRICTS=Object.freeze([
  {id:'arrival',name:'Southgate Approach',x:0,z:-7,description:'A guarded road into the city'},
  {id:'market',name:'Merchant Quarter',x:0,z:19,description:'Bank, general shop and covered market'},
  {id:'heartwood',name:'Heartwood Square',x:0,z:39,description:'A great oak surrounded by the old city'},
  {id:'exchange',name:'Trade Quarter',x:15,z:64.5,description:'The Trade House and future auction exchange'},
  {id:'green',name:'The Green Quarter',x:37,z:68,description:'The ornamental gardens east of the Trade House'},
  {id:'wardens',name:"Warden's Hall",x:-29,z:76,description:"The city's civic and defensive heart"}
]);
const mat={
 stone:createSurfaceMaterial(THREE,'#b8b4a1','limestone',{flatShading:true}),
 pale:createSurfaceMaterial(THREE,'#d2c6a9','limestone',{flatShading:true}),
 cobble:createSurfaceMaterial(THREE,'#a7a38e','road',{flatShading:true}),
 dark:createSurfaceMaterial(THREE,'#566559','limestone',{flatShading:true}),
 bronze:new THREE.MeshStandardMaterial({color:'#b99a64',roughness:.4,metalness:.58,flatShading:true}),
 iron:new THREE.MeshStandardMaterial({color:'#59645c',roughness:.49,metalness:.68,flatShading:true}),
 bark:createSurfaceMaterial(THREE,'#705039','timber',{flatShading:true}),
 barkLight:createSurfaceMaterial(THREE,'#8e6546','timber',{flatShading:true}),
 leaf:new THREE.MeshLambertMaterial({color:'#577a4c',flatShading:true}),
 leafLight:new THREE.MeshLambertMaterial({color:'#74925c',flatShading:true}),
 leafGold:new THREE.MeshLambertMaterial({color:'#9cab64',flatShading:true}),
 cloth:createSurfaceMaterial(THREE,'#486f62','cloth',{side:THREE.DoubleSide}),
 brass:new THREE.MeshStandardMaterial({color:'#d5bc7f',roughness:.29,metalness:.74,flatShading:true}),
 wood:createSurfaceMaterial(THREE,'#684d38','timber',{flatShading:true}),
 clay:createSurfaceMaterial(THREE,'#947353','plaster',{flatShading:true}),
 flower:new THREE.MeshLambertMaterial({color:'#e6be7f',flatShading:true}),
 flowerBlue:new THREE.MeshLambertMaterial({color:'#a2bdd2',flatShading:true}),
 water:new THREE.MeshLambertMaterial({color:'#76a2a0',transparent:true,opacity:.78,depthWrite:false}),
 smoke:new THREE.MeshBasicMaterial({color:'#e4e1cf',transparent:true,opacity:.28,depthWrite:false}),
 light:new THREE.MeshBasicMaterial({color:'#ffdca1'})
};
const box=new THREE.BoxGeometry(1,1,1),foliage=new THREE.IcosahedronGeometry(1,1),cyl=new THREE.CylinderGeometry(1,1,1,9),sphere=new THREE.IcosahedronGeometry(1,0);
function mesh(root,geo,m,x,y,z,sx=1,sy=1,sz=1,shadow=true){
 const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=shadow;o.receiveShadow=shadow;root.add(o);return o;
}
const block=(root,m,x,y,z,w,h,d,shadow=true)=>mesh(root,box,m,x,y,z,w,h,d,shadow);
function at(scene,x,z,name){
 const g=new THREE.Group();g.name=name;g.userData.cityFeature=name;g.position.set(x,terrainHeight(x,z),z);scene.add(g);return g;
}
function instancedScatter(scene,points,geo,m,scale=.3,y=.06){
 if(!points.length)return;
 const inst=new THREE.InstancedMesh(geo,m,points.length),dummy=new THREE.Object3D();
 inst.name='City flowers and small details';inst.castShadow=false;inst.receiveShadow=false;
 for(let i=0;i<points.length;i++){
  const [x,z,s=1]=points[i];dummy.position.set(x,terrainHeight(x,z)+y, z);
  dummy.rotation.set(0,i*2.39996,0);dummy.scale.setScalar(scale*s);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
 }
 inst.instanceMatrix.needsUpdate=true;inst.computeBoundingSphere();scene.add(inst);
}
function treeOak(scene){
 const root=at(scene,0,39,'Heartwood Oak');
 root.userData.cityLandmark='heartwood-oak';
 const ring=new THREE.Mesh(new THREE.TorusGeometry(4.0,.26,8,24),mat.stone);
 ring.position.y=.18;ring.rotation.x=Math.PI/2;root.add(ring);
 // Roots extend beyond the trunk but remain visual; the traversable ring surrounds
 // the existing 2.2m trunk collider in town-world.js.
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  const rootwood=block(root,mat.barkLight,Math.sin(a)*1.25,.33,Math.cos(a)*1.25,.46,.37,2.8);
  rootwood.rotation.y=a;rootwood.rotation.x=.08;
 }
 mesh(root,cyl,mat.bark,0,4.1,0,1.25,8.2,1.25);
 for(let j=0;j<11;j++){
  const a=j*2.39996,wide=j%2===0;
  const radius=wide?4.4:3.3;
  const branch=mesh(root,cyl,mat.barkLight,Math.sin(a)*radius*.48,7.6+(j%3)*.64,Math.cos(a)*radius*.48,.40+(j%2)*.09,radius*1.75,.40+(j%2)*.09);
  branch.rotation.z=-Math.sin(a)*.56;branch.rotation.x=Math.cos(a)*.56;
 }
 const crowns=[
  [0,12.5,0,5.3,3.5,5.2],
  [-3.6,10.9,1,4.2,2.5,3.7],[3.5,10.8,-.8,4.3,2.7,3.9],
  [.7,11.7,4,4.2,2.8,3.8],[-.8,11.8,-3.9,4.1,2.6,3.8],
  [0,14.3,0,3.2,2.2,3.4],[-4.9,11.9,-2.4,2.3,1.9,2.5],
  [4.6,11.6,2.1,2.7,1.9,2.5]
 ];
 for(const [i,p] of crowns.entries())mesh(root,foliage,[mat.leaf,mat.leafLight,mat.leafGold][i%3],...p,false);
 // Old city plaque and low decorative benches leave the walking lanes clear.
 const plaque=block(root,mat.stone,0,.68,3.25,2.2,.88,.36);
 block(root,mat.bronze,0,.70,3.48,1.78,.53,.07);
 return root;
}
function bench(g,x,z,a=0){
 const group=new THREE.Group();group.position.set(x,.1,z);group.rotation.y=a;g.add(group);
 block(group,mat.wood,0,.52,0,2.6,.25,.7);
 block(group,mat.wood,0,1.06,.27,2.6,.85,.18);
 for(const sx of [-1,1])for(const sz of [-1,1])block(group,mat.iron,sx*1.01,.25,sz*.23,.18,.5,.18);
}
function pot(g,x,z,green=mat.leaf){
 const root=new THREE.Group();root.position.set(x,0,z);g.add(root);
 mesh(root,cyl,mat.clay,0,.33,0,.37,.66,.37,false);
 mesh(root,foliage,green,0,1.0,0,.58,.60,.54,false);
 return root;
}
function flag(g,x,y,z,side,animation){
 const p=block(g,mat.wood,x,y,z,.13,3,.13);
 mesh(g,new THREE.ConeGeometry(.18,.40,6),mat.brass,x,y+1.63,z);
 const cloth=block(g,mat.cloth,x+side*.54,y+.70,z,1.04,.78,.045,false);
 cloth.userData.animated=true;animation.push({mesh:cloth,mode:'flag',seed:x+z+side,base:cloth.rotation.y});
 return p;
}
function signpost(scene,x,z,angle=0){
 const g=at(scene,x,z,'City wayfinding sign');
 g.rotation.y=angle;
 block(g,mat.wood,0,1.6,0,.20,3.2,.20);
 for(const [h,direction] of [[2.7,1],[2.17,-1]]){
  const board=block(g,mat.barkLight,direction*.71,h,0,1.40,.38,.18);
  board.rotation.z=direction*.06;
  block(g,mat.brass,direction*1.34,h,0,.13,.36,.22);
 }
}
function townGate(scene,z,animation,kind){
 const g=at(scene,0,z,kind==='south'?'Southgate':'Northgate');
 g.userData.cityLandmark=kind==='south'?'southgate':'northgate';
 // Avoid duplicating the existing southern gate's colliders.
 for(const side of [-1,1]){
  const tower=block(g,mat.stone,side*9,2.7,0,3.7,5.4,3.6);
  block(g,mat.pale,side*9,5.5,0,4.25,.40,4.1);
  for(const s of [-1,0,1])block(g,mat.stone,side*9+s*1.30,6.02,0,1.0,.75,3.5);
  block(g,mat.wood,side*7.6,2.35,-2,.40,3.8,.40);
  flag(g,side*9,7.55,0,side,animation);
  addWorldObstacle({x:side*9,z,r:1.9,height:6.4});
 }
 block(g,mat.stone,0,6.10,0,16,.85,1.5);
 for(let i=-6;i<=6;i+=2)block(g,mat.stone,i,6.78,0,1.15,.55,1.8);
 block(g,mat.bronze,0,5.35,-.84,4.35,.43,.18);
}
function cityWalls(scene){
 // A limestone outer shell beyond the older timber palisade; no sealed
 // entrance or long invisible collision strips across the arrival road.
 for(const side of [-1,1]){
  const group=at(scene,side*44,37,'Outer city wall');
  for(let z=-50;z<=50;z+=3.9){
   block(group,mat.stone,0,2.05,z,.95,4.1,3.8);
   block(group,mat.pale,0,4.35,z,1.30,.55,3.7);
   for(const dz of [-1.3,1.3])block(group,mat.stone,0,4.95,z+dz,1.36,.64,1.05);
  }
  addWorldObstacle({x:side*44,z:36.5,hx:.70,hz:50,height:5});
 }
 const rear=at(scene,0,86,'North wall walks');
 for(const side of [-1,1]){
  block(rear,mat.stone,side*25,2.1,0,36,4.2,1);
  block(rear,mat.pale,side*25,4.4,0,36,.45,1.32);
  addWorldObstacle({x:side*25,z:86,hx:18,hz:.58,height:5});
 }
}
function gardens(scene,animation){
 const plot=at(scene,37,68,'Green Quarter park');
 // Thin grass and stone beds, with paving routes remaining unobstructed.
 const areas=[[-1,-4],[1,1]];
 for(const [x,z] of areas){
  const bed=at(scene,37+x,68+z,'Green Quarter planted bed');
  mesh(bed,new THREE.CylinderGeometry(2.65,2.8,.16,12),mat.stone,0,.10,0,1,.80,.78);
  mesh(bed,new THREE.CylinderGeometry(2.40,2.45,.09,12),mat.leaf,0,.20,0,1,.75,.73,false);
  for(let i=0;i<9;i++){
   const a=i*Math.PI*2/9;const fx=Math.sin(a)*1.9,fz=Math.cos(a)*1.6;
   mesh(bed,new THREE.IcosahedronGeometry(.16,0),i%3?mat.flower:mat.flowerBlue,fx,.44,fz,1,.8,1,false);
  }
 }
 // Pond tucked away from the central street and north exit.
 const pond=at(scene,38,82,'Garden reflection pond');
 mesh(pond,new THREE.CylinderGeometry(2.3,2.6,.32,20),mat.stone,0,.14,0,1,.75,.8);
 mesh(pond,new THREE.CylinderGeometry(1.95,2,.06,20),mat.water,0,.34,0,1,1,.72,false);
 addWorldObstacle({x:38,z:82,r:2.35,height:.4});
 for(const {x,z,angle:a} of OAKREST_GARDEN_BENCHES){
  const g=at(scene,x,z,'Garden resting place');bench(g,0,0,a);
  addWorldObstacle({x,z,hx:Math.abs(Math.cos(a))*1.39+Math.abs(Math.sin(a))*.42,
    hz:Math.abs(Math.sin(a))*1.39+Math.abs(Math.cos(a))*.42,height:1.52});
 }
 const leaves=[];
 for(let i=0;i<12;i++){
  const a=i*2.39996,r=2.5+(i%3)*.95;
  const leaf=mesh(plot,sphere,i%4?mat.leafGold:mat.leaf,Math.sin(a)*r,2+i%4*.4,Math.cos(a)*r,.15,.045,.35,false);
  leaf.userData.animated=true;leaves.push({mesh:leaf,seed:i,baseY:leaf.position.y});
 }
 animation.push(...leaves.map(item=>({...item,mode:'leaf'})));
}
function market(scene,animation){
 const sq=at(scene,0,39,'Heartwood cobbled square');
 // Stone pavers outside the walking lanes: no collision under pedestrians.
 for(let i=0;i<10;i++){
  const a=i*Math.PI*2/10,rad=8.7;
  const px=Math.sin(a)*rad,pz=Math.cos(a)*rad;
  const stone=mesh(sq,cyl,mat.cobble,px,terrainHeight(px,39+pz)-sq.position.y+.055,pz,.8,.10,1.0,false);
  stone.rotation.y=a;
 }
 for(const [x,zWorld,a] of OAKREST_SQUARE_BENCHES){
  // Furniture has its own true ground anchor, not the square centre's
  // elevation. Otherwise benches float as streets approach the hills.
  const g=at(scene,x,zWorld,'Square resting place');
  bench(g,0,0,a);
  addWorldObstacle({x,z:zWorld,hx:1.42,hz:.76,height:1.5});
 }
 for(const [x,z] of [[-11,-3],[-11,3],[11,-3],[11,3]]){
  const group=at(scene,x,39+z,'Square flower urn');pot(group,0,0);
 }
 const boards=[[-12,10],[12,10],[-13,3]];
 for(const [x,z] of boards){
  const g=at(scene,x,39+z,'Civic noticeboard');
  block(g,mat.wood,0,1.7,0,2.6,2,.18);
  block(g,mat.pale,0,1.7,.12,2.35,1.6,.1);
  addWorldObstacle({x,z:z+39,hx:1.30,hz:.22,height:2.8});
  for(let i=0;i<4;i++)block(g,mat.clay,-.72+i*.47,1.55+(i%2)*.33,.22,.36,.22,.035,false);
 }
 for(const [x,z] of [[-14,7],[14,-7]]){
  const g=at(scene,x,39+z,'Square hanging lantern');
  block(g,mat.wood,0,1.2,0,.15,2.4,.15);
  const lantern=mesh(g,foliage,mat.light,0,2.55,0,.24,.36,.24,false);
  lantern.userData.animated=true;
  animation.push({mode:'lantern',mesh:lantern,seed:x+z,base:1});
 }
}
function cobbles(scene){
 const coords=[];
 // Paths remain readable because their broad paving is authored in town-world.
 // Instanced inset paving gives each district a historical, worn feeling.
 for(let z=-4;z<80;z+=2.8){
  for(const x of [-7.5,7.5]){
   if(z>33&&z<46)continue;
   coords.push([x+(z%3)*.16,z,.70]);
  }
 }
 instancedScatter(scene,coords,new THREE.BoxGeometry(1,.1,.63),mat.cobble,1,.07);
}
function marketGoods(scene){
 // Distinct areas suggest different trades without granting every skill here.
 for(const {x,z} of OAKREST_TRADE_TABLES){
  const g=at(scene,x,z,'Street trade');
  for(const sx of [-1,1])for(const zz of [-1,1])block(g,mat.wood,sx*.7,.36,zz*.52,.18,.7,.16);
  block(g,mat.barkLight,0,.78,0,2.2,.18,1.5);
  addWorldObstacle({x,z,hx:1.08,hz:.73,height:1.35});
  for(let i=0;i<5;i++){
   const thing=mesh(g,i%2?sphere:box,i%3===0?mat.leafGold:i%3===1?mat.flower:mat.clay,-.75+i*.37,1.06,(i%2)*.32-.2,.2,.18,.2,false);
   thing.rotation.y=i;
  }
 }
}
function chimneys(scene,animation){
 // Silhouettes from rooftops; smoke sprites are very sparse and time-varying.
 const roofs=[[30,14,5.7],[-30,14,5.7],[-29,76,6.0],[29,75,5.2]];
 for(const [x,z,h] of roofs){
  const g=at(scene,x+2.1,z-1.6,'Hearth chimney');
  block(g,mat.stone,0,h,0,.92,2.8,.92);
  block(g,mat.pale,0,h+1.42,0,1.12,.23,1.12);
  for(let i=0;i<3;i++){
   const puff=mesh(g,sphere,mat.smoke,0,h+2.25+i*.65,0,.48+i*.18,.26+i*.10,.45+i*.18,false);
   puff.userData.animated=true;
   animation.push({mode:'smoke',mesh:puff,seed:i+z*.1,baseY:puff.position.y});
  }
 }
}
function birds(scene,animation){
 for(let i=0;i<5;i++){
  const g=at(scene,0,39,'Square birds');
  const bird=new THREE.Group();bird.userData.animated=true;g.add(bird);
  block(bird,mat.dark,0,0,0,.40,.14,.22,false);
  for(const side of [-1,1]){
   const wing=block(bird,mat.dark,side*.32,0,0,.55,.035,.22,false);
   wing.rotation.z=side*.25;
  }
  bird.position.y=14+i*.4;
  animation.push({mode:'bird',mesh:bird,seed:i,radius:11+i*1.1,baseY:bird.position.y});
 }
}
function lamps(scene,animation){
 for(const [x,z] of OAKREST_CITY_LAMPS){
  const g=at(scene,x,z,'Bronze city lamp');
  block(g,mat.wood,0,1.55,0,.17,3.1,.17);
  block(g,mat.brass,0,3.05,0,.62,.15,.62);
  const light=mesh(g,new THREE.OctahedronGeometry(.33,0),mat.light,0,2.72,0,1,1,1,false);
  light.userData.animated=true;animation.push({mode:'lantern',mesh:light,seed:x+z,base:1});
 }
}
/** All animation objects are registered to survive batchScenery. */
export function buildCityIdentity(scene){
 const animations=[];
 treeOak(scene);market(scene,animations);
 gardens(scene,animations);marketGoods(scene);cobbles(scene);
 townGate(scene,-13,animations,'south');townGate(scene,86,animations,'north');
 cityWalls(scene);chimneys(scene,animations);birds(scene,animations);lamps(scene,animations);
 for(const [x,z,a] of OAKREST_SIGNPOSTS)signpost(scene,x,z,a);
 return {
  districts:CITY_DISTRICTS,
  landmark:{x:0,z:39,name:'Heartwood Oak'},
  ambientCount:animations.length,
  update(t,player){
   // Long-distance atmospheric animation: 38 tiny transform updates/frame max.
   for(const item of animations){
    const o=item.mesh,k=item.seed;
    if(item.mode==='bird'){
     const a=t*.26+k*1.23,r=item.radius;
     o.position.set(Math.sin(a)*r,item.baseY+Math.sin(t*1.4+k)*.40,Math.cos(a)*r);
     o.rotation.y=-a;
    }else if(item.mode==='flag')o.rotation.y=item.base+Math.sin(t*1.5+k)*.17;
    else if(item.mode==='smoke'){
     const drift=(t*.28+k*.31)%1;
     o.position.set(Math.sin(t*.7+k)*.24,item.baseY+drift*1.5,Math.cos(t*.4+k)*.24);
     o.scale.setScalar(.8+drift*.62);
     o.material.opacity=.28; // uniform opacity: shared material remains shared
    }else if(item.mode==='leaf'){
     o.position.y=item.baseY+Math.sin(t*.55+k)*.48;
     o.rotation.y=t*.36+k;
    }else if(item.mode==='lantern')o.scale.setScalar(.91+Math.sin(t*2.1+k)*.09);
   }
  }
 };
}
