import * as THREE from 'three';
import {REGIONAL_BOUNDS,REGIONAL_HUBS,REGIONAL_CAMPS,REGIONAL_GATHERING,
 REGIONAL_ROADS,REGIONAL_BUILDINGS,REGIONAL_TREES} from './classic-world-expansion.js';
import {organicRoadPolygons} from './classic-art-direction.js';
import {groundPolygons} from './classic-terrain-view.js';

/** The existing Classic scene owns controls, combat, saves and camera.
 * This is purely low-cost scenery driven by the canonical regional registry.
 * All obstacles here have matching rectangles/circles in classic-world-expansion.
 */
export function createRegionalWorldScene(scene){
 const root=new THREE.Group();root.name='oakrest-regional-expansion';scene.add(root);
 const shared=new Map(),shapes=new Map();
 const material=color=>{
  if(!shared.has(color))shared.set(color,new THREE.MeshLambertMaterial({color}));
  return shared.get(color);
 };
 const shape=(kind,create)=>{
  if(!shapes.has(kind))shapes.set(kind,create());
  return shapes.get(kind);
 };
 const cube=shape('cube',()=>new THREE.BoxGeometry(1,1,1));
 const cone=shape('roof',()=>new THREE.ConeGeometry(1,1.35,4));
 const rock=shape('rock',()=>new THREE.DodecahedronGeometry(1,0));
 const treeTrunk=shape('treeTrunk',()=>new THREE.CylinderGeometry(.24,.34,3,5));
 const treeTop=shape('treeTop',()=>new THREE.IcosahedronGeometry(1,0));
 const put=(parent,geometry,color,x,y,z,sx=1,sy=1,sz=1)=>{
  const mesh=new THREE.Mesh(geometry,material(color));
  mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
 };
 const badge=(parent,name,x,z,tint='#fff0c3')=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=70;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='rgba(27,42,34,.90)';ctx.fillRect(0,0,512,70);
  ctx.strokeStyle='#ae9767';ctx.lineWidth=4;ctx.strokeRect(2,2,508,66);
  ctx.fillStyle=tint;ctx.textAlign='center';ctx.font='bold 27px Georgia,serif';
  ctx.fillText(name,256,45,494);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));
  sprite.scale.set(16,2.2,1);sprite.position.set(x,8,z);
  parent.add(sprite);return texture;
 };
 // One vertex-colour terrain plane with no changes to the flat gameplay plane.
 // The existing village/quest ground is raised a few centimetres above it.
 const w=REGIONAL_BOUNDS.maxX-REGIONAL_BOUNDS.minX,d=REGIONAL_BOUNDS.maxZ-REGIONAL_BOUNDS.minZ;
 const base=new THREE.PlaneGeometry(w,d,94,96);
 base.rotateX(-Math.PI/2);base.translate((REGIONAL_BOUNDS.minX+REGIONAL_BOUNDS.maxX)/2,-.12,
  (REGIONAL_BOUNDS.minZ+REGIONAL_BOUNDS.maxZ)/2);
 const tones={
  heartland:'#6d8c60',forest:'#4e7954',highlands:'#777d70',snow:'#b3bfbd',
  coast:'#849b79',marsh:'#607d64',river:'#738968',farmland:'#a19863',grassland:'#8e9668'
 };
 const positions=base.attributes.position,colors=[];
 const jitter=(x,z)=>Math.sin(x*.043+z*.027)*Math.cos(z*.063-x*.019);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i);
  let palette=new THREE.Color('#6f8c62'),weight=0;
  for(const hub of REGIONAL_HUBS){
   if(hub.existing)continue;
   const distance=Math.hypot(x-hub.x,z-hub.z);
   const influence=Math.max(0,1-distance/(hub.biome==='snow'?150:hub.biome==='highlands'?138:105));
   if(influence>weight){weight=influence;palette=new THREE.Color(tones[hub.biome]||tones.heartland);}
  }
  if(x< -210&&z> -80&&z<180)palette.lerp(new THREE.Color(tones.forest),.24);
  const colour=new THREE.Color('#759166').lerp(palette,Math.max(.15,weight*.94))
   .multiplyScalar(.95+(.04*jitter(x,z)));
  colors.push(colour.r,colour.g,colour.b);
  positions.setY(i,-.12+jitter(x,z)*.007);
 }
 base.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));base.computeVertexNormals();
 const terrain=new THREE.Mesh(base,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
 terrain.name='regional-traversable-ground';root.add(terrain);
 // Roads use exactly the same authored centreline as the 2D map.
 const roadGeometry=REGIONAL_ROADS.map(r=>r.points);
 for(const [width,y,color,label] of [
  [7.1,-.055,'#617953','wide-natural-verges'],
  [5.5,-.043,'#85765c','region-dirt-road'],
  [3.7,-.032,'#b8a07a','region-packed-centre']
 ]){
  const road=groundPolygons(organicRoadPolygons(roadGeometry,width),y,color);
  road.name=label;root.add(road);
 }
 // All regional tree visual instances correspond one-to-one with collision
 // circles. No trees secretly placed on the actual connecting routes.
 if(REGIONAL_TREES.length){
  const trunk=new THREE.InstancedMesh(treeTrunk,material('#654d37'),REGIONAL_TREES.length);
  const canopy=new THREE.InstancedMesh(treeTop,material('#426f4d'),REGIONAL_TREES.length);
  const dummy=new THREE.Object3D();
  REGIONAL_TREES.forEach((t,i)=>{
   dummy.position.set(t.x,1.35,t.z);dummy.scale.set(1,1,1);dummy.updateMatrix();
   trunk.setMatrixAt(i,dummy.matrix);
   dummy.position.set(t.x,3.3,t.z);
   dummy.scale.set(1.8+(i%3)*.1,1.7+(i%5)*.09,1.8+(i%4)*.1);
   dummy.updateMatrix();canopy.setMatrixAt(i,dummy.matrix);
  });
  trunk.instanceMatrix.needsUpdate=true;canopy.instanceMatrix.needsUpdate=true;
  trunk.frustumCulled=false;canopy.frustumCulled=false;root.add(trunk,canopy);
 }
 const hubs=[];
 for(const hub of REGIONAL_HUBS){
  if(hub.existing)continue; // The original capital is still its own full scene.
  const group=new THREE.Group();group.name='regional-hub-'+hub.id;root.add(group);
  const city=hub.kind==='city',farm=hub.kind==='farm';
  const ground=new THREE.Mesh(new THREE.CircleGeometry(city?31:farm?23:25,32),
   new THREE.MeshLambertMaterial({color:farm?'#bca66a':hub.biome==='snow'?'#a7aba7':'#a89d79',
    transparent:true,opacity:.65,side:THREE.DoubleSide}));
  ground.rotation.x=-Math.PI/2;ground.position.set(hub.x,-.025,hub.z);group.add(ground);
  const roofPalette=hub.biome==='snow'?['#6b8699','#677a89','#7b919b']:
   hub.biome==='coast'?['#b06c4d','#c08b54','#b9a472']:
    ['#986a55','#537b83','#667c57'];
  for(const b of REGIONAL_BUILDINGS.filter(b=>b.hub===hub.id)){
   const height=city?5.2+(b.roof%2)*1.1:farm?3.1:4.1;
   put(group,cube,hub.biome==='snow'?'#cbc9ba':'#d5b995',
    b.x,height/2,b.z,b.w,height,b.d);
   put(group,cone,roofPalette[b.roof],b.x,height+.9,b.z,
    b.w*.73,2.4,b.d*.73).rotation.y=Math.PI/4;
   put(group,cube,'#544b3e',b.x,height*.46,b.z+b.d/2+.02,2,2,.13);
  }
  if(city){
   for(const side of [-1,1]){
    const x=hub.x+side*33;
    put(group,cube,'#9b9e91',x,4.4,hub.z,5.5,8.8,5.5);
    put(group,cone,roofPalette[1],x,10,hub.z,4,4,4).rotation.y=Math.PI/4;
   }
  }
  if(farm){
   for(let i=0;i<8;i++){
    const side=i%2?1:-1;
    const x=hub.x+side*(32+(i%3)*5),z=hub.z-24+Math.floor(i/2)*12;
    put(group,cube,i%3?'#b79b59':'#8b9c53',x,.02,z,5,.04,9);
   }
  }
  const tex=badge(group,hub.name,hub.x,hub.z,city?'#ffe6ac':'#f4ddaf');
  hubs.push({group,position:hub,tex});
 }
 const camps=[];
 for(const camp of REGIONAL_CAMPS){
  const group=new THREE.Group();group.name='regional-camp-'+camp.id;root.add(group);
  const tint=camp.live?'#927352':'#7b7a70';
  for(let i=0;i<3;i++){
   const angle=i*2.09,px=camp.x+Math.cos(angle)*5,pz=camp.z+Math.sin(angle)*5;
   put(group,cone,tint,px,1.5,pz,2.8,3,2.8).rotation.y=Math.PI/4;
   put(group,cube,'#584737',px,.16,pz,3,.32,3);
  }
  put(group,cube,'#66513b',camp.x,2.2,camp.z,.21,4.4,.21);
  put(group,cube,camp.live?'#ad7254':'#79817c',camp.x+1.1,3.4,camp.z,.1,1.15,2.3);
  const tex=badge(group,camp.name+(camp.live?'':' · Later'),camp.x,camp.z,
   camp.live?'#f1c89e':'#c6c5bd');
  camps.push({group,position:camp,tex});
 }
 const gatherings=[];
 for(const site of REGIONAL_GATHERING){
  const group=new THREE.Group();group.name='regional-resource-'+site.id;root.add(group);
  if(site.skill==='mining'||site.biome==='highlands')
   for(let i=0;i<6;i++)put(group,rock,'#838b84',site.x+(i%3)*4-4,.9,site.z+Math.floor(i/3)*5,2.2+i%2,1.7,2.5);
  if(site.id==='silverlake'){
   const lake=put(group,shape('disc',()=>new THREE.CylinderGeometry(1,1,.02,40)),
    '#5d9da4',site.x,.002,site.z,13,1,9);
   lake.material=new THREE.MeshLambertMaterial({color:'#5d9da4',transparent:true,opacity:.82});
  }
  if(site.skill==='hunting')for(let i=0;i<4;i++)
   put(group,rock,'#998a70',site.x+(i-2)*3,.4,site.z+4,.9,.7,1);
  const tex=badge(group,site.name+(site.live?'':' · Future skill'),site.x,site.z,
   site.live?'#d6e7bb':'#b9c2b0');
  gatherings.push({group,position:site,tex});
 }
 return {root,
  update(player){
   // Keep distant decorative settlements, labels and camps out of the draw
   // list; trees and continuous roads remain in shared instanced meshes.
   for(const {group,position} of [...hubs,...camps,...gatherings])
    group.visible=Math.abs(player.x-position.x)<125&&Math.abs(player.z-position.z)<115;
  },
  dispose(){
   scene.remove(root);
   root.traverse(obj=>{if(obj.geometry&&!shapes.has('never')&&!Array.from(shapes.values()).includes(obj.geometry))obj.geometry.dispose();
    if(obj.material?.map){obj.material.map.dispose();obj.material.dispose();}
   });
   for(const geometry of shapes.values())geometry.dispose();
   for(const mat of shared.values())mat.dispose();
   for(const node of [...hubs,...camps,...gatherings])node.tex.dispose();
  }
 };
}
