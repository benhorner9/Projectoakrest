import {addWorldObstacle} from './terrain.js';
import {reservedTownGround,OAKREST_MARKET_CRATES,OAKREST_MARKET_BARRELS,OAKREST_VEGETABLE_BEDS} from './town-layout.js';
/**
 * Oakrest visual direction: warm storybook timber-and-stone village,
 * mossy forest edge, painted low-poly colours and a readable golden-hour sky.
 * Procedural meshes only; shared materials/instancing keep iPad memory down.
 */
export function createOakrestScenery({THREE,scene,random,MAT}){
  const materials={
    trail:new THREE.MeshLambertMaterial({color:'#a79172'}),
    dust:new THREE.MeshLambertMaterial({color:'#bba17d'}),
    verge:new THREE.MeshLambertMaterial({color:'#7b9b64'}),
    vergeDark:new THREE.MeshLambertMaterial({color:'#617f59'}),
    stone:new THREE.MeshLambertMaterial({color:'#7f8e7c',flatShading:true}),
    stoneLight:new THREE.MeshLambertMaterial({color:'#c2b6a0',flatShading:true}),
    grass:new THREE.MeshLambertMaterial({color:'#507a49',flatShading:true,side:THREE.DoubleSide}),
    flowers:new THREE.MeshLambertMaterial({color:'#f1c68b',flatShading:true}),
    leaf:new THREE.MeshLambertMaterial({color:'#7b9463',flatShading:true}),
    oak:new THREE.MeshLambertMaterial({color:'#6b4a31',flatShading:true}),
    oakTrim:new THREE.MeshLambertMaterial({color:'#cba776',flatShading:true}),
    cloth:new THREE.MeshLambertMaterial({color:'#9e694f',flatShading:true}),
    moss:new THREE.MeshLambertMaterial({color:'#3f6651',flatShading:true}),
    lamp:new THREE.MeshBasicMaterial({color:'#ffd38a'}),
    lantern:new THREE.MeshBasicMaterial({color:'#f2e1ac',transparent:true,opacity:.82,depthWrite:false})
  };
  const cube=new THREE.BoxGeometry(1,1,1);
  const sphere=new THREE.IcosahedronGeometry(1,0);
  const dummy=new THREE.Object3D();
  let decorativeMeshes=0;
  function add(geom,material,x,y,z,sx=1,sy=1,sz=1,shadow=false){
    const o=new THREE.Mesh(geom,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);
    o.castShadow=shadow;o.receiveShadow=false;scene.add(o);decorativeMeshes++;return o;
  }
  function cub(m,x,y,z,sx,sy,sz){return add(cube,m,x,y,z,sx,sy,sz);}
  function groundMark(x,z,rx,rz,material,at=-.030){
    const p=add(new THREE.CircleGeometry(1,9),material,x,at,z,rx,rz,1);
    p.rotation.x=-Math.PI/2;p.visible=false;return p;
  }
  // Narrow, uneven dust islands on the old road; blend into grass at the edges.
  for(let i=0;i<37;i++){
    const z=-63+i*3.1;
    const x=(random()-.5)*5.9;
    groundMark(x,z,.9+random()*1.35,.45+random()*1.2,i%4===0?materials.trail:materials.dust,-.034);
  }
  for(let i=0;i<58;i++){
    const z=(random()-.5)*125,x=(random()-.5)*18;
    if(Math.abs(x)<4.8)continue;
    groundMark(x,z,.7+random()*2.8,.45+random()*1.6,i%3===0?materials.vergeDark:materials.verge);
  }
  // Large patches of overgrowth around cabins, with details clearly out of the road.
  for(const [x,z] of [[-16,7],[-17,22],[16,5],[16,24],[-9,-36],[9,-46]]){
    for(let j=0;j<6;j++){
      const t=j/6*Math.PI*2,r=2.2+random()*2;
      groundMark(x+Math.cos(t)*r,z+Math.sin(t)*r,.9+random(),.6+random(),materials.vergeDark,-.029);
    }
  }
  // Deterministic rejection prevents instanced tufts, flowers and pebbles from
  // penetrating ANY indoor floor, doorway, cobbled path or Heartwood Square.
  function wildGround(){
    for(let i=0;i<24;i++){
      const x=(random()-.5)*128,z=(random()-.5)*128;
      if(!reservedTownGround(x,z))return {x,z};
    }
    const x=(random()>.5?1:-1)*(72+random()*18),z=(random()-.5)*170;
    return {x,z};
  }
  // Geometry instancing: low draw-call cost for undergrowth, river pebbles and flowers.
  const bladeGeometry=new THREE.BufferGeometry();bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.14,0,0, .14,0,0, .06,.45,.04, 0,0,-.12, 0,0,.12, -.05,.35,.06],3));bladeGeometry.computeVertexNormals();materials.grass.color.set('#ffffff');materials.grass.side=THREE.DoubleSide;
  const tufts=new THREE.InstancedMesh(bladeGeometry,materials.grass,1100);
  tufts.castShadow=false;tufts.frustumCulled=true;
  for(let i=0;i<1100;i++){
    const {x,z}=wildGround();
    const sc=.45+random()*1.5;dummy.position.set(x,sc*.26-.01,z);
    dummy.rotation.set(0,random()*Math.PI*2,(random()-.5)*.16);
    dummy.scale.setScalar(sc);dummy.updateMatrix();
    tufts.setMatrixAt(i,dummy.matrix);
    tufts.setColorAt(i,new THREE.Color(i%3===0?'#b9a86a':i%2?'#7b9a62':'#578852'));
  }
  tufts.instanceMatrix.needsUpdate=true;tufts.computeBoundingSphere();
  if(tufts.instanceColor)tufts.instanceColor.needsUpdate=true;
  scene.add(tufts);
  const pebbles=new THREE.InstancedMesh(sphere,materials.stone.clone(),115);pebbles.material.color.set('#ffffff');
  for(let i=0;i<115;i++){
    const {x,z}=wildGround();
    const scale=.13+random()*.42;
    dummy.position.set(x,scale*.24-.005,z);
    dummy.rotation.set(0,random()*6.28,0);
    dummy.scale.set(scale,scale*.43,scale*.7);dummy.updateMatrix();
    pebbles.setMatrixAt(i,dummy.matrix);
    pebbles.setColorAt(i,new THREE.Color(i%3?'#bcae96':'#809383'));
  }
  pebbles.instanceMatrix.needsUpdate=true;if(pebbles.instanceColor)pebbles.instanceColor.needsUpdate=true;
  scene.add(pebbles);
  const blossoms=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.11,0),materials.flowers.clone(),110);blossoms.material.color.set('#ffffff');
  for(let i=0;i<110;i++){
    const {x,z}=wildGround();
    dummy.position.set(x,.38,z);
    dummy.rotation.set(0,random()*6.28,0);dummy.scale.setScalar(.6+random()*.8);dummy.updateMatrix();
    blossoms.setMatrixAt(i,dummy.matrix);
    blossoms.setColorAt(i,new THREE.Color(i%5===0?'#cfc5f0':i%3===0?'#f6eee0':'#e6c875'));
  }
  blossoms.instanceMatrix.needsUpdate=true;if(blossoms.instanceColor)blossoms.instanceColor.needsUpdate=true;
  scene.add(blossoms);
  // Sparser weathered rocks for silhouettes around the road and outer forest.
  for(let i=0;i<38;i++){
    const sign=random()>.5?1:-1;
    const x=sign*(8+random()*45),z=(random()-.5)*105;
    if(Math.abs(x)<43&&z>-14&&z<90)continue;
    const r=.5+random()*.95;
    const rock=add(sphere,i%3?materials.stone:materials.stoneLight,x,r*.43-.03,z,r,r*.72,r*.8);
    rock.rotation.y=random()*Math.PI;addWorldObstacle({x,z,r:r*.85,height:r*1.15});
  }
  function lantern(x,z){addWorldObstacle({x,z,r:.12,height:3.2});
    cub(materials.oak,x,1.6,z,.16,3.15,.16);
    cub(materials.oakTrim,x,3.0,z,.65,.12,.65);
    const glass=add(new THREE.CylinderGeometry(.25,.23,.58,6),materials.lantern,x,2.7,z);
    cub(materials.oakTrim,x,2.38,z,.5,.11,.5);
    const flame=add(new THREE.OctahedronGeometry(.13,0),materials.lamp,x,2.72,z,.52,.85,.52);
    flame.userData.animated=true;return {flame,glass,base:2.72};
  }
  const lamps=[lantern(-7.1,5.3),lantern(7.2,5.3),lantern(-6.7,-9.5),lantern(7.1,-9.5),lantern(-5.9,-33),lantern(5.9,-50)];
  // Wooden market cart, wooden crates, barrels and a direction sign by the square.
  function crate(x,z,size=.8){addWorldObstacle({x,z,hx:size*.5,hz:size*.5,height:size});
    cub(materials.oak,x,size*.5,z,size,size,size);
    for(const offset of [-.33,.33]){
      cub(materials.oakTrim,x+offset*size,.5*size,z+size*.51,.085*size,size*.88,.05);
    }
  }
  for(const [x,z,sc] of OAKREST_MARKET_CRATES){
    crate(x,z,sc);
  }
  function barrel(x,z){addWorldObstacle({x,z,r:.48,height:1.08});
    add(new THREE.CylinderGeometry(.47,.43,1.03,9),materials.oak,x,.53,z);
    for(const y of [.17,.86])add(new THREE.CylinderGeometry(.48,.48,.09,9),materials.stone,x,y,z);
  }
  for(const [x,z] of OAKREST_MARKET_BARRELS)barrel(x,z);
  function cart(x,z){addWorldObstacle({x,z,hx:1.45,hz:.95,height:2.6});
    cub(materials.oak,x,1.05,z,2.45,.16,1.55);cub(materials.oakTrim,x,1.22,z,2.65,.18,1.7);
    for(const s of [-1,1]){
      const wheel=add(new THREE.TorusGeometry(.46,.12,6,11),materials.oak,x+s*1.25,.57,z);
      wheel.rotation.y=Math.PI/2;
    }
    for(const xx of [-.95,.95])for(const zz of [-.60,.60])cub(materials.oak,x+xx,1.86,z+zz,.12,1.24,.12);
    const awning=cub(materials.cloth,x,2.51,z,2.6,.10,1.9);
    awning.rotation.z=.07;
    for(const dx of [-.5,.5])crate(x+dx,z,.53);
  }
  cart(-9.8,5);
  // Small vegetable beds near cottages, naturally framing the village.
  for(const [cx,cz] of OAKREST_VEGETABLE_BEDS){
    const w=3.1,d=1.55;
    cub(materials.oak,cx,.23,cz-d/2,w,.46,.19);
    cub(materials.oak,cx,.23,cz+d/2,w,.46,.19);
    for(const xx of [-w/2,w/2])cub(materials.oak,cx+xx,.23,cz,.19,.46,d);
    const dirt=add(new THREE.BoxGeometry(1,1,1),materials.trail,cx,.11,cz,w-.4,.14,d-.25);
    for(let i=0;i<6;i++){
      const x=cx+((i%3)-1)*.83,z=cz+(i<3?-.38:.38);
      add(new THREE.ConeGeometry(.24,.47,5),materials.leaf,x,.43,z);
    }
  }
  // A shallow creek crossing the lower forest, with stepping stones and reeds.
  for(let i=0;i<16;i++){
    const x=-26+i*3.2,z=-54+Math.sin(i*.43)*1.8;
    groundMark(x,z,2.4,1.05,MAT.water,-.026);
    if(i%3===0){
      const r=add(sphere,materials.stoneLight,x+.25,.13,z,.65,.25,.52);r.rotation.y=random();
    }
  }
  // A gradient dome follows the camera and avoids downloading sky textures.
  const domeGeom=new THREE.SphereGeometry(145,20,10);
  const colours=[];const pos=domeGeom.getAttribute('position');
  const bottom=new THREE.Color('#efcc99'),middle=new THREE.Color('#a9c8b7'),top=new THREE.Color('#557b91');
  for(let i=0;i<pos.count;i++){
    const t=Math.max(0,Math.min(1,(pos.getY(i)/145+.14)*1.6));
    const c=t<.45?bottom.clone().lerp(middle,t/.45):middle.clone().lerp(top,(t-.45)/.55);
    colours.push(c.r,c.g,c.b);
  }
  domeGeom.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  const dome=new THREE.Mesh(domeGeom,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false}));
  dome.renderOrder=-2000;dome.frustumCulled=false;scene.add(dome);
  const motesCount=26,motesPos=new Float32Array(motesCount*3),motesBase=[];
  for(let i=0;i<motesCount;i++){
    const x=(random()-.5)*32,z=(random()-.5)*60-10,y=.8+random()*3;
    motesBase.push({x,y,z,phase:random()*6.28});
    motesPos[i*3]=x;motesPos[i*3+1]=y;motesPos[i*3+2]=z;
  }
  const pointsGeometry=new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position',new THREE.BufferAttribute(motesPos,3));
  const motes=new THREE.Points(pointsGeometry,new THREE.PointsMaterial({color:'#ffe3a1',size:.16,transparent:true,opacity:.7,depthWrite:false,sizeAttenuation:true}));
  scene.add(motes);
  function update(time,camera){
    dome.position.copy(camera.position);
    for(let i=0;i<motesCount;i++){
      const a=motesBase[i],j=i*3;
      motesPos[j]=a.x+Math.sin(time*.45+a.phase)*.27;
      motesPos[j+1]=a.y+Math.sin(time*.9+a.phase)*.22;
    }
    pointsGeometry.attributes.position.needsUpdate=true;
    for(let i=0;i<lamps.length;i++){
      const lamp=lamps[i];
      lamp.flame.scale.y=.75+Math.sin(time*7+i)*.16;
    }
  }
  return {update,count:decorativeMeshes+320+115+110,lamps:lamps.length};
}
/** Add permanent costume details but keep the existing limb rig and hitboxes. */
export function enrichHero({THREE,g,block,ball,mat,MAT,leftLeg,rightLeg,leftArm,rightArm}){
 const bronze=mat('#ba9269'),edge=mat('#d8bd8c'),cloth=mat('#384f48'),iron=mat('#687d7e');
 const belt=mat('#4b3027'),eyes=mat('#343029'),boot=mat('#3f3431');
 block(g,0,.96,-.10,.97,.16,.64,belt);block(g,0,.97,-.44,.18,.20,.065,edge);
 block(g,0,1.36,-.37,.71,.74,.095,cloth);
 block(g,0,1.52,-.442,.14,.49,.035,bronze);
 for(const sx of [-1,1]){
  block(g,sx*.36,1.67,-.29,.17,.23,.14,bronze);
  ball(g,sx*.16,2.17,-.358,.045,.048,.025,eyes);
 }
 ball(g,0,1.98,-.385,.12,.05,.035,bronze);
 const cape=block(g,0,1.18,.33,.93,1.25,.16,cloth);
 cape.rotation.x=-.08;
 for(const leg of [leftLeg,rightLeg]){
  block(leg,0,-.57,-.11,.34,.29,.43,boot);
  block(leg,0,-.17,-.20,.34,.25,.09,bronze);
 }
 for(const arm of [leftArm,rightArm]){
  ball(arm,0,-.06,0,.24,.25,.28,bronze);
  block(arm,0,-.53,-.11,.28,.24,.35,boot);
 }
 const chestPlate=block(g,0,1.3,-.465,.76,.72,.13,iron);
 block(chestPlate,0,0,-.53,.55,.08,.25,edge);
 chestPlate.visible=false;
 return {cape,chestPlate,cloth,iron};
}
export function enrichEnemy({THREE,type,g,block,ball,mat,MAT}){
 const bone=mat('#d4c39d'),fur=mat('#6a4b36'),leaf=mat('#3e764a');
 if(type==='mossling'){
  for(const s of [-1,1]){
   const ear=ball(g,s*.6,.78,-.2,.35,.16,.29,leaf);ear.rotation.z=s*.35;
   ball(g,s*.35,.43,-.62,.1,.09,.06,mat('#d0e797'));
  }
  for(let i=0;i<4;i++){
   const leaflet=ball(g,(i-1.5)*.26,.97+i%2*.10,.04,.20,.43,.13,leaf);
   leaflet.rotation.z=(i-1.5)*.35;
  }
 }else if(type==='boar'){
  for(const s of [-1,1]){
   const tusk=ball(g,s*.38,.49,-1.27,.13,.23,.12,bone);
   tusk.rotation.z=s*.3;
   ball(g,s*.52,1.26,-.08,.22,.30,.16,fur);
  }
  for(let i=0;i<5;i++){
   const tuft=ball(g,0,1.22,-.7+i*.35,.18,.3,.2,fur);tuft.rotation.x=-.17;
  }
 }else if(type==='bandit'){
  const scarf=mat('#bd8b5c'),hood=mat('#403d40'),bronze=mat('#c7a775');
  block(g,0,1.7,-.15,.91,.23,.68,scarf);
  ball(g,0,2.24,.07,.46,.24,.49,hood);
  block(g,0,.93,-.34,.92,.14,.55,hood);
  block(g,0,1.02,-.38,.16,.19,.08,bronze);
  for(const s of [-1,1])ball(g,s*.18,2.08,-.351,.04,.05,.025,MAT.black);
 }
}