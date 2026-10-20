import * as THREE from 'three';
import {terrainHeight,addWorldObstacle} from './terrain.js';
import {OAKREST_SERVICES,OAKREST_GROVES} from './town-services.js';

/** Lightweight, real-geometry Oakrest extension. Shared materials and low detail
 * keep the additional streets usable on an iPad without remote downloads.
 * Every solid building/wall/trunk registers with the same gameplay collisions.
 */
export function buildOakrestTown(scene){
  const shared={
    stone:new THREE.MeshLambertMaterial({color:'#999e98'}),
    stoneLight:new THREE.MeshLambertMaterial({color:'#c4c4b3'}),
    timber:new THREE.MeshLambertMaterial({color:'#7e5941'}),
    trim:new THREE.MeshLambertMaterial({color:'#c99c65'}),
    dark:new THREE.MeshLambertMaterial({color:'#384f48'}),
    wood:new THREE.MeshLambertMaterial({color:'#5c4939'}),
    slate:new THREE.MeshLambertMaterial({color:'#4c6a76'}),
    moss:new THREE.MeshLambertMaterial({color:'#527b59'}),
    red:new THREE.MeshLambertMaterial({color:'#956953'}),
    gold:new THREE.MeshLambertMaterial({color:'#dfbd6c'}),
    blue:new THREE.MeshLambertMaterial({color:'#7199ae'}),
    dirt:new THREE.MeshLambertMaterial({color:'#ab9876'}),
    glass:new THREE.MeshLambertMaterial({color:'#a9ccce',transparent:true,opacity:.72})
  };
  const cube=new THREE.BoxGeometry(1,1,1);
  const solids=[];
  const b=(parent,mat,x,y,z,w,h,d)=>{
    const m=new THREE.Mesh(cube,mat);m.position.set(x,y,z);m.scale.set(w,h,d);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const makeGroup=(x,z)=>{
    const root=new THREE.Group();root.position.set(x,terrainHeight(x,z),z);scene.add(root);return root;
  };
  function addBuilding(x,z,w,d,roof,service=false){
    const g=makeGroup(x,z),h=service?6.1:4.1;
    b(g,shared.stone,0,h*.49,0,w,h*.98,d);
    b(g,shared.timber,0,1.25,d/2+.10,w*.31,2.5,.24);
    b(g,shared.wood,0,1.10,d/2+.26,w*.23,2.2,.12);
    const cap=b(g,roof,0,h+.85,0,w+1.55,1.8,d+1.3);
    cap.rotation.z=service?-.04:.035;
    for(const sign of [-1,1]){
      b(g,shared.trim,sign*(w/2-.75),1.8,d/2+.14,.55,1,.12);
      b(g,shared.glass,sign*(w/2-.75),1.8,d/2+.22,.34,.7,.065);
    }
    b(g,shared.trim,0,h+.05,d/2+.2,w*.42,.22,.14);
    addWorldObstacle({x,z,hx:w*.5,hz:d*.5,height:h+2});
    solids.push({x,z,w,d});
    return g;
  }
  // The village grows out from the original four cottages into a town with
  // distinct districts. Entrances face the central north/south pedestrian road.
  const bank=OAKREST_SERVICES.find(s=>s.id==='bank');
  const store=OAKREST_SERVICES.find(s=>s.id==='store');
  const lodge=OAKREST_SERVICES.find(s=>s.id==='forester');
  const bankGroup=addBuilding(bank.x,bank.z,10,9,shared.slate,true);
  const vault=new THREE.Mesh(new THREE.TorusGeometry(.95,.21,8,24),shared.gold);
  vault.position.set(0,3.9,4.95);bankGroup.add(vault);
  b(bankGroup,shared.wood,0,3.9,5.01,.22,1.25,.16);
  const shopGroup=addBuilding(store.x,store.z,10,9,shared.red,true);
  b(shopGroup,shared.gold,0,3.95,4.9,3,.65,.18);
  for(const dx of [-1.2,-.4,.4,1.2])b(shopGroup,dx%2?shared.red:shared.trim,dx,3.43,5.15,.55,.37,1.25);
  const lodgeGroup=addBuilding(lodge.x,lodge.z,11,9,shared.moss,true);
  b(lodgeGroup,shared.trim,0,3.9,4.95,3.4,.45,.13);
  const crossedAxe=b(lodgeGroup,shared.stoneLight,-.17,4.45,5.12,.15,1.25,.19);crossedAxe.rotation.z=.65;
  const crossedAxe2=b(lodgeGroup,shared.stoneLight,.17,4.45,5.15,.15,1.25,.19);crossedAxe2.rotation.z=-.65;
  // Residential workshops and the southern guardhouse make the hub inhabited,
  // without adding every skill trainer to the same settlement.
  addBuilding(29,42,8,7,shared.dark);
  addBuilding(29,58,8,7,shared.red);
  addBuilding(-29,-2,8,7,shared.dark);
  addBuilding(29,-2,8,7,shared.moss);
  // Cobbled square, market stalls and water trough. Decals are not solid.
  const plaza=makeGroup(0,39);
  b(plaza,shared.dirt,0,.008,0,14,.025,11);
  const well=new THREE.Mesh(new THREE.CylinderGeometry(2.05,2.2,1.25,10),shared.stone);
  well.position.set(0,.62,0);well.castShadow=true;plaza.add(well);
  const opening=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.65,.06,10),shared.dark);
  opening.position.set(0,1.26,0);plaza.add(opening);
  addWorldObstacle({x:0,z:39,r:2.15,height:1.4});
  // Roadside stalls leave the main route open.
  for(const [x,z,roof] of [[-9,43,shared.red],[9,49,shared.blue],[9,17,shared.moss]]){
    const stall=makeGroup(x,z);
    b(stall,shared.timber,0,1,0,3.5,.25,2.3);
    for(const sx of [-1,1])for(const sz of [-1,1])b(stall,shared.wood,sx*1.47,1.45,sz*.9,.18,2.8,.18);
    b(stall,roof,0,2.95,0,4.1,.25,2.7);
    addWorldObstacle({x,z,hx:1.7,hz:1.1,height:3});
  }
  // Long palisades announce a guarded settlement and prevent cutting straight
  // through the service buildings. Gate opening is clear at the original arch.
  for(const x of [-42,42]){
    for(let z=-9;z<=63;z+=4.5){
      const post=makeGroup(x,z);
      b(post,shared.wood,0,2.3,0,.55,4.6,.55);
      b(post,shared.trim,0,4.65,0,.8,.25,.8);
    }
    const side=makeGroup(x,27);
    b(side,shared.timber,0,1.8,0,.25,3.6,72);
    addWorldObstacle({x,z:27,hx:.3,hz:36,height:4.8});
  }
  for(const [x,w] of [[-24,35],[24,35]]){
    const wall=makeGroup(x,-13);
    b(wall,shared.timber,0,1.7,0,w,3.4,.45);
    addWorldObstacle({x,z:-13,hx:w*.5,hz:.3,height:3.5});
  }
  for(const x of [-5.2,5.2]){
    const gate=makeGroup(x,-13);
    b(gate,shared.stone,0,2.3,0,.9,4.6,.9);
  }
  const gateCap=makeGroup(0,-13);b(gateCap,shared.trim,0,4.65,0,11,.55,.9);
  // The first woodcutting practice trees belong to Oakrest's one specialist
  // trainer. Level 5 is the cap here; advanced skills belong in later regions.
  for(const tree of OAKREST_GROVES){
    const g=makeGroup(tree.x,tree.z);
    b(g,shared.wood,0,1.75,0,.67,3.5,.67);
    for(const [xx,yy,zz,scale] of [[0,4,0,1],[.6,3.45,-.1,.7],[-.6,3.55,.1,.72]]){
      const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.42*scale,1),shared.moss);
      crown.position.set(xx,yy,zz);crown.castShadow=true;g.add(crown);
    }
    addWorldObstacle({x:tree.x,z:tree.z,r:.5,height:4});
  }
  // Marker lamps lead players across a meaningful peaceful journey to the
  // frontier. Nothing hostile is placed at either side of the city gate.
  for(const z of [-18,-27,-37,-46]){
    for(const x of [-5.8,5.8]){
      const g=makeGroup(x,z);
      b(g,shared.wood,0,1.45,0,.17,2.9,.17);
      b(g,shared.gold,0,2.98,0,.48,.42,.48);
    }
  }
  return {buildings:solids.length,services:OAKREST_SERVICES.length,groves:OAKREST_GROVES.length};
}
