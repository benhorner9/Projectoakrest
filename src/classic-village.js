import {batchClassicStatics} from './classic-static-batch.js';
import {createClassicTerrain} from './classic-terrain-view.js';
import {addClassicGroundDetails} from './classic-ground-detail-mesh.js';
/** Block 2 scene builder. Only the renderer changes: coordinates come from town-layout. */
import * as THREE from 'three';
import {OAKREST_BUILDINGS,OAKREST_WELL,FACING,roadQuads} from './town-layout.js';
import {CLASSIC_ROADS,CLASSIC_PERIMETER,CLASSIC_DISTRICTS,CLASSIC_PLAZAS,CLASSIC_STALLS,classicRoofColour} from './classic-town-plan.js';
import {CLASSIC_TREES,CLASSIC_NPCS} from './classic-presentation.js';
import {OAKREST_GROVES,OAKREST_NOTICES} from './town-services.js';
import {interiorFixtures} from './classic-interior-fixtures.js';
import {applySkillTreeVisual} from './classic-skill-visuals.js';
const MAT={
 grass:new THREE.MeshLambertMaterial({color:'#73956c'}),
 grass2:new THREE.MeshLambertMaterial({color:'#668c63'}),
 wallStone:new THREE.MeshLambertMaterial({color:'#879083'}),
 mortar:new THREE.MeshLambertMaterial({color:'#657568'}),
 banner:new THREE.MeshLambertMaterial({color:'#9a654f',side:THREE.DoubleSide}),
 road:new THREE.MeshLambertMaterial({color:'#b49a76'}),
 sand:new THREE.MeshLambertMaterial({color:'#c9af83'}),
 stone:new THREE.MeshLambertMaterial({color:'#abb1a0'}),
 plaster:new THREE.MeshLambertMaterial({color:'#d7c5a1'}),
 light:new THREE.MeshLambertMaterial({color:'#e4d0aa'}),
 wood:new THREE.MeshLambertMaterial({color:'#73533d'}),
 darkwood:new THREE.MeshLambertMaterial({color:'#57432f'}),
 trim:new THREE.MeshLambertMaterial({color:'#b58a59'}),
 glass:new THREE.MeshLambertMaterial({color:'#8faeab'}),
 windowFrame:new THREE.MeshLambertMaterial({color:'#574b3b'}),
 roofDetail:new THREE.MeshLambertMaterial({color:'#b5a98c',side:THREE.DoubleSide}),
 grey:new THREE.MeshLambertMaterial({color:'#667b7c'}),
 brass:new THREE.MeshLambertMaterial({color:'#d2ae66',emissive:'#36250c'}),
 parchment:new THREE.MeshLambertMaterial({color:'#ead8aa'}),
 produce:new THREE.MeshLambertMaterial({color:'#81975e'}),
 roofRed:new THREE.MeshLambertMaterial({color:'#9b675e',side:THREE.DoubleSide}),
 roofBlue:new THREE.MeshLambertMaterial({color:'#627886',side:THREE.DoubleSide}),
 roofGreen:new THREE.MeshLambertMaterial({color:'#728568',side:THREE.DoubleSide}),
 leaf:new THREE.MeshLambertMaterial({color:'#527755',flatShading:true}),
 leafLight:new THREE.MeshLambertMaterial({color:'#708f65',flatShading:true})
};
const box=new THREE.BoxGeometry(1,1,1),ring=new THREE.CylinderGeometry(1,1,1,12);
function mesh(parent,g,m,x,y,z,sx=1,sy=1,sz=1){
 const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.receiveShadow=false;parent.add(o);return o;
}
const cube=(p,m,x,y,z,w,h,d)=>mesh(p,box,m,x,y,z,w,h,d);
function signTexture(label){
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=90;
 const c=canvas.getContext('2d');c.fillStyle='#443829';c.fillRect(0,0,384,90);
 c.strokeStyle='#c8ae74';c.lineWidth=6;c.strokeRect(5,5,374,80);
 c.fillStyle='#f6e7c5';c.font='bold 34px Georgia,serif';c.textAlign='center';
 c.fillText(label,192,58,350);
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function nameBoard(parent,label,z){
 const board=new THREE.Mesh(new THREE.PlaneGeometry(3.75,.9),new THREE.MeshBasicMaterial({map:signTexture(label),transparent:false,side:THREE.DoubleSide}));
 board.position.set(0,2.82,z);parent.add(board);
}
function building(parent,b,i){
 const g=new THREE.Group();g.position.set(b.x,0,b.z);g.rotation.y=FACING[b.face];
 parent.add(g);
 const w=b.w,d=b.d,h=b.kind==='bank'||b.kind==='hall'?4.9:4.1;
 const special=b.kind==='bank'||b.kind==='trade'||b.kind==='store';
 const wall=b.kind==='bank'?MAT.stone:special?MAT.light:MAT.plaster;
 const roofMaterial=({ '#9b675e':MAT.roofRed,'#728568':MAT.roofGreen,'#627886':MAT.roofBlue})[classicRoofColour(b,i)];
 cube(g,MAT.stone,0,.17,0,w+.5,.34,d+.5);
 for(let plank=-w/2+.5;plank<w/2;plank+=1.3)cube(g,i%2?MAT.trim:MAT.wood,plank,.36,0,.05,.08,d-.45);
 const thick=.32,doorWidth=3.1;
 // Four independent walls. The front is split to form an actual walkable gap.
 cube(g,wall,0,h/2,-d/2,w,h,thick);
 cube(g,wall,-w/2,h/2,0,thick,h,d);
 cube(g,wall,w/2,h/2,0,thick,h,d);
 cube(g,wall,-(w+doorWidth)/4,h/2,d/2,(w-doorWidth)/2,h,thick);
 cube(g,wall,(w+doorWidth)/4,h/2,d/2,(w-doorWidth)/2,h,thick);
 cube(g,MAT.wood,0,h-.3,d/2,doorWidth+.1,.6,.46);
 cube(g,MAT.wood,-doorWidth/2,1.35,d/2,.28,2.7,.50);
 cube(g,MAT.wood,doorWidth/2,1.35,d/2,.28,2.7,.50);
 // Corner joints, window sills and lintel seal the facade against visible cracks.
 for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])
  cube(g,MAT.trim,x,h/2,z,.46,h+.05,.46);
 cube(g,MAT.trim,0,h-.56,d/2+.26,doorWidth+.35,.2,.35);
 for(const x of [-w/2+1,w/2-1]){
  cube(g,MAT.wood,x,h/2,d/2+.2,.16,h-.2,.14);
  // Recessed panes, timber mullions and tiny shutters read from the elevated camera.
  cube(g,MAT.windowFrame,x,h*.64,d/2+.20,.91,.90,.16);
  cube(g,MAT.glass,x,h*.64,d/2+.30,.70,.68,.09);
  cube(g,MAT.trim,x,h*.64,d/2+.36,.06,.72,.10);
  cube(g,MAT.trim,x,h*.64,d/2+.36,.74,.06,.10);
  for(const side of [-1,1])
   cube(g,MAT.wood,x+side*.53,h*.64,d/2+.28,.17,.82,.16);
  cube(g,MAT.stone,x,h*.64-.44,d/2+.36,1.12,.15,.28);
 }
 for(const x of [-w/2+.6,w/2-.6])cube(g,MAT.wood,x,h/2,-d/2-.17,.18,h,.17);

 // Solid interior furniture shares dimensions with the movement and A* collision model.
 cube(g,MAT.wood,0,.34,0,w-.5,.11,d-.5);
 for(let x=-w/2+.9;x<w/2;x+=1.25)cube(g,MAT.trim,x,.401,0,.035,.012,d-.65);
 for(const f of interiorFixtures(b)){
  cube(g,MAT[f.material]||MAT.wood,f.x,.39+f.h/2,f.z,f.w,f.h,f.d);
  cube(g,MAT.darkwood,f.x,.39+f.h+.055,f.z,f.w+.11,.11,f.d+.11);
  if(f.id==='teller-counter'){
   for(const dx of [-f.w*.32,0,f.w*.32]){
    cube(g,MAT.brass,dx,.39+f.h+.11,f.z,.42,.09,.28);
    cube(g,MAT.parchment,dx,.39+f.h+.17,f.z,.32,.025,.21);
   }
  }else if(f.id==='shop-counter'){
   for(const dx of [-f.w*.30,f.w*.08]){
    cube(g,MAT.produce,f.x+dx,.39+f.h+.25,f.z,.55,.28,.51);
    cube(g,MAT.parchment,f.x+dx,.39+f.h+.39,f.z,.62,.06,.54);
   }
  }else if(f.id==='back-shelves'){
   for(const height of [0,.85,1.7])cube(g,MAT.trim,f.x,.55+height,f.z,f.w,.12,f.d+.08);
   for(let j=0;j<7;j++)cube(g,j%3?MAT.parchment:MAT.produce,
    f.x-f.w*.43+j*f.w*.14,1.1,f.z,.3,.65,.42);
  }else if(f.id==='bank-safe')cube(g,MAT.brass,f.x,.39+f.h*.55,f.z+f.d/2+.07,.62,.72,.10);
  else if(f.id==='supply-crates')for(const dx of [-.35,.35])
   cube(g,MAT.produce,f.x+dx,.39+f.h+.19,f.z,.43,.32,.43);
  else if(f.id==='ledger-lectern'){
   // The visitor's ledger is on a physical lectern, not a floating texture.
   cube(g,MAT.parchment,f.x,.39+f.h+.085,f.z,f.w*.73,.09,f.d*.7);
   cube(g,MAT.brass,f.x,.39+f.h+.14,f.z+.13,.16,.035,.48);
  }else if(f.id==='display-stand'){
   for(const dx of [-.25,.25])cube(g,MAT.produce,f.x+dx,.39+f.h+.21,f.z,.34,.37,.46);
   cube(g,MAT.parchment,f.x,.39+f.h+.43,f.z,.75,.07,.56);
  }else if(f.id==='bed')cube(g,MAT.roofGreen,f.x,.39+f.h+.07,f.z,f.w-.1,.14,f.d-.2);
 }
 if(b.kind==='bank'||b.kind==='store'||b.kind==='trade')for(const side of [-1,1]){
  cube(g,MAT.brass,side*(doorWidth/2+.47),2.1,d/2+.41,.21,.44,.18);
  cube(g,MAT.parchment,side*(doorWidth/2+.47),2.1,d/2+.54,.09,.2,.06);
 }
 // Carved fork braces and an acorn lintel are the village's repeated motif.
 for(const side of [-1,1]){
  const brace=cube(g,MAT.trim,side*(doorWidth/2+.28),2.8,d/2+.3,.16,1.05,.22);brace.rotation.z=side*.55;
 }
 mesh(g,new THREE.IcosahedronGeometry(.3,0),MAT.trim,0,h-.1,d/2+.35,1,1.3,.45);
 const roofs=new THREE.Group();roofs.userData.dynamic=true;g.add(roofs);
 // Closed triangular gable ends hide the former roof-to-wall daylight gaps.
 // These stay in the cutaway group so entering a building still reveals its interior.
 for(const side of [-1,1]){
  const triangle=new THREE.BufferGeometry();
  triangle.setAttribute('position',new THREE.Float32BufferAttribute([
   side*w/2,h,-d/2, side*w/2,h,d/2, side*w/2,h+2.65,0
  ],3));triangle.computeVertexNormals();
  mesh(roofs,triangle,new THREE.MeshLambertMaterial({color:wall.color,side:THREE.DoubleSide}),0,0,0);
  cube(roofs,MAT.trim,side*(w/2+.08),h+.16,0,.23,.3,d+.25);
 }
 // Gabled roof: two wide sloping halves with consistent overhang.
 const angle=Math.atan2(2.65,d/2+.5),slope=Math.hypot(d/2+.5,2.65);
 for(const sign of [-1,1]){
  const panel=cube(roofs,roofMaterial,0,h+1.33,(sign*(d/4+.25)),w+1.4,.20,slope+.38);
  panel.rotation.x=sign*angle;
  cube(roofs,MAT.wood,0,h+1.28,sign*(d/4+.25),w+1.5,.12,slope+.42).rotation.x=sign*angle;
  // Two subtle eave/shingle highlight courses follow the slope, never raise roof geometry.
  for(const offset of [-slope*.22,slope*.22]){
   const stripe=cube(roofs,MAT.roofDetail,0,h+1.46-sign*Math.sin(angle)*offset,
    sign*(d/4+.25)+Math.cos(angle)*offset,w+1.25,.032,.075);
   stripe.rotation.x=sign*angle;
  }
 }
 cube(roofs,MAT.trim,0,h+2.66,0,w+1.6,.28,.34);
 for(const end of [-1,1]){const tip=cube(roofs,MAT.darkwood,end*(w/2+.75),h+2.95,0,.23,1.05,.3);tip.rotation.z=-end*.45;}
 for(const sign of [-1,1])for(let seam=-w/2;seam<=w/2;seam+=1.4){const rib=cube(roofs,MAT.darkwood,seam,h+1.47,sign*(d/4+.25),.065,.07,slope+.4);rib.rotation.x=sign*angle;}
 // Chimney stacks and ridge caps share the same house-specific roof group.
 if(i%3!==1){cube(roofs,MAT.stone,-w*.26,h+2.8,-d*.16,.8,2.1,.75);
  cube(roofs,MAT.trim,-w*.26,h+3.88,-d*.16,1.1,.22,1.02);}
 if(b.kind==='bank')nameBoard(g,'OAKREST BANK',d/2+.48);
 if(b.kind==='store')nameBoard(g,'GENERAL STORE',d/2+.48);
 if(b.kind==='forester')nameBoard(g,'FORESTER',d/2+.48);
 if(b.kind==='trade')nameBoard(g,'TRADE HALL',d/2+.48);
 return {id:b.id,roofs,g};
}
function drawPerimeter(root){
 const {walls,gates,west,east,south,north}=CLASSIC_PERIMETER;
 for(const wall of walls){
  const [x1,z1]=wall.a,[x2,z2]=wall.b;
  const horizontal=Math.abs(x2-x1)>Math.abs(z2-z1);
  const length=Math.hypot(x2-x1,z2-z1);
  const x=(x1+x2)/2,z=(z1+z2)/2;
  cube(root,MAT.wallStone,x,1.6,z,horizontal?length+1:.9,3.2,horizontal?.9:length+1);
  cube(root,MAT.mortar,x,.35,z,horizontal?length+1.3:1.25,.65,horizontal?1.25:length+1.3);
  cube(root,MAT.trim,x,3.23,z,horizontal?length+1.1:1.1,.2,horizontal?1.1:length+1.1);
  // A regular parapet silhouette; keep mesh count modest for Safari.
  for(let distance=.85;distance<length-.3;distance+=2.5){
   const t=distance/length,px=x1+(x2-x1)*t,pz=z1+(z2-z1)*t;
   cube(root,MAT.wallStone,px,3.55,pz,horizontal?1.4:.95,.55,horizontal?.95:1.4);
  }
 }
 // Gatehouses close all four architectural breaks overhead, while their
 // broad passages remain truly traversable at player height.
 for(const gate of gates){
  const horizontal=gate.orientation==='horizontal';
  for(const side of [-1,1]){
   const x=gate.x+(horizontal?side*gate.opening*.5:0);
   const z=gate.z+(horizontal?0:side*gate.opening*.5);
   cube(root,MAT.wallStone,x,2.5,z,2.6,5,2.6);
   cube(root,MAT.trim,x,5.05,z,3.2,.35,3.2);
   for(const dx of [-.95,.95])for(const dz of [-.95,.95])
    cube(root,MAT.wallStone,x+dx,5.45,z+dz,.7,.6,.7);
  }
  // Portcullis is raised: never put a box collider across the opening.
  cube(root,MAT.darkwood,gate.x,4.6,gate.z,horizontal?gate.opening:1.5,1.05,horizontal?1.5:gate.opening);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.7),
    new THREE.MeshBasicMaterial({map:signTexture(gate.name.toUpperCase()),side:THREE.DoubleSide}));
  board.position.set(gate.x,4.55,gate.z+(horizontal?1.0:0));root.add(board);
 }
 for(const x of [west,east])for(const z of [south,north]){
  mesh(root,new THREE.CylinderGeometry(2.1,2.35,5.6,8),MAT.wallStone,x,2.8,z);
  mesh(root,new THREE.ConeGeometry(3.1,2.05,8),MAT.roofBlue,x,6.2,z);
 }
}
// Shared woodland geometries let the existing static instancer batch hundreds
// of trunks and crown lobes instead of creating a new GPU buffer for each tree.
const TREE_TRUNK=new THREE.CylinderGeometry(.23,.34,3.1,6);
const TREE_CROWN=new THREE.IcosahedronGeometry(1,1);
const TREE_SHADOW=new THREE.CircleGeometry(2.1,16);
const TREE_SHADOW_MATERIAL=new THREE.MeshBasicMaterial({color:'#243e31',transparent:true,opacity:.16,depthWrite:false});
export function createOakrestTree(root,x,z,index,scale=1){
 const group=new THREE.Group();group.position.set(x,0,z);root.add(group);
 mesh(group,TREE_TRUNK,MAT.wood,0,1.5,0,scale,scale,scale);
 // Broad, asymmetrical alder crowns replace the uniform conifer stacks.
 for(let k=0;k<4;k++){
  const angle=k*2.4+index,spread=k?1.05:0;
  const crown=mesh(group,TREE_CROWN,k%2?MAT.leafLight:MAT.leaf,
   Math.cos(angle)*spread*scale,(3.8+(k%2)*.65)*scale,Math.sin(angle)*spread*scale,1.65*scale,1.35*scale,1.5*scale);
  crown.rotation.y=angle;
 }
 const shadow=mesh(group,TREE_SHADOW,TREE_SHADOW_MATERIAL,0,.008,0,scale,scale,scale);
 shadow.rotation.x=-Math.PI/2;
 return group;
}
function pathGeometry(quads){
 const verts=[],uv=[];
 for(const poly of quads){
  const pts=[poly[0],poly[1],poly[2],poly[0],poly[2],poly[3]];
  for(const [x,z] of pts){verts.push(x,.032,z);uv.push(x*.1,z*.1);}
 }
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geom.computeVertexNormals();return geom;
}
export function createClassicVillage(scene){
 const root=new THREE.Group();scene.add(root);
 createClassicTerrain(root);
 const groundDetails=addClassicGroundDetails(root);
 drawPerimeter(root);
 // District marker posts make the town legible as multiple neighbourhoods.
 for(const district of CLASSIC_DISTRICTS){
  const sign=new THREE.Group();sign.position.set(district.x+5,0,district.z+3);
  root.add(sign);
  cube(sign,MAT.darkwood,0,1.1,0,.22,2.2,.22);
  const plaque=new THREE.Mesh(new THREE.PlaneGeometry(4.1,.8),
   new THREE.MeshBasicMaterial({map:signTexture(district.name.toUpperCase()),side:THREE.DoubleSide}));
  plaque.position.set(0,2.32,.25);sign.add(plaque);
 }
 const roofs=OAKREST_BUILDINGS.map((b,i)=>building(root,b,i));
 for(const [i,t] of CLASSIC_TREES.entries())createOakrestTree(root,t.x,t.z,i,.85+(i%4)*.09);
 // Interactive grove meshes must remain unbatched so axes can shake and fell them.
 // Collision and resource yields are still owned by their existing systems.
 const groveVisuals=new Map();
 for(const [i,grove] of OAKREST_GROVES.entries()){
  const treeGroup=createOakrestTree(root,grove.x,grove.z,i,1.02);
  treeGroup.userData.interactId='grove:'+grove.id;
  treeGroup.userData.dynamic=true;
  const stump=mesh(root,ring,MAT.wood,grove.x,.28,grove.z,.52,.55,.52);
  stump.visible=false;stump.userData.dynamic=true;
  groveVisuals.set(treeGroup.userData.interactId,{tree:treeGroup,stump});
 }
 for(const notice of OAKREST_NOTICES){
  const g=new THREE.Group();g.position.set(notice.x,0,notice.z);root.add(g);
  cube(g,MAT.darkwood,0,1.25,0,.23,2.5,.23);
  cube(g,MAT.trim,0,2.2,.18,2.55,1.3,.21);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(2.36,.89),
   new THREE.MeshBasicMaterial({map:signTexture('NOTICES'),side:THREE.DoubleSide}));
  board.position.set(0,2.25,.31);g.add(board);
  g.userData.interactId='notice:'+notice.id;
 }

 // Decorated greenbelt trees do not sit on the navigable village paths.
 for(const [i,[x,z]] of [[-50,27],[-49,51],[50,24],[49,53],[-51,72],[51,70],[-50,-8],[50,-8]].entries())createOakrestTree(root,x,z,i,.89);
 // Well and its roof.
 const wx=OAKREST_WELL.x,wz=OAKREST_WELL.z;
 mesh(root,ring,MAT.stone,wx,.56,wz,1.65,1.13,1.65);
 mesh(root,ring,MAT.darkwood,wx,1.18,wz,1.47,.18,1.47);
 for(const offset of [-1.3,1.3])cube(root,MAT.wood,wx+offset,2.55,wz,.25,2.85,.25);
 cube(root,MAT.trim,wx,4.06,wz,3.9,.25,3.5);
 const wellTop=mesh(root,new THREE.ConeGeometry(2.6,1.55,4),MAT.roofRed,wx,4.62,wz);wellTop.rotation.y=Math.PI/4;
 for(const [i,{x,z,roof}] of CLASSIC_STALLS.entries()){
  for(const dx of [-2,2])cube(root,MAT.wood,x+dx,1.4,z,.19,2.7,.19);
  const canopy=cube(root,({'#9b675e':MAT.roofRed,'#728568':MAT.roofGreen,'#627886':MAT.roofBlue})[roof],x,2.8,z,4.65,.2,3.2);
  canopy.rotation.z=i%2?.08:-.08;
  cube(root,MAT.darkwood,x,.9,z,3.5,1.1,1.25);
 }
 // Lanterns to ground the scale at the market and city roads.
 for(const [x,z] of [[-8,39],[8,39],[-10,69],[10,69],[-8,10],[8,10]]){
  cube(root,MAT.wood,x,1.4,z,.15,2.8,.15);
  cube(root,MAT.trim,x,2.88,z,.55,.2,.55);
  mesh(root,new THREE.OctahedronGeometry(.22),new THREE.MeshBasicMaterial({color:'#ffd99b'}),x,2.65,z);
 }
 for(const item of roofs)batchClassicStatics(item.roofs);
 const batching=batchClassicStatics(root);
 const ribbons=[];
 for(const gate of CLASSIC_PERIMETER.gates){
  const ribbon=new THREE.Mesh(new THREE.PlaneGeometry(.65,2.4,1,4),MAT.banner);
  ribbon.position.set(gate.x+2.5,3.2,gate.z+.8);ribbon.userData.dynamic=true;root.add(ribbon);ribbons.push(ribbon);
 }
 // Distant banks frame the valley beyond the walkable boundary.
 for(const side of [-1,1])for(let i=0;i<6;i++){
  mesh(root,new THREE.IcosahedronGeometry(1,1),i%2?MAT.leaf:MAT.grass2,side*(65+i%2*5),-.5,-14+i*23,12,4+i%3,16);
 }
 const npcMarkers=CLASSIC_NPCS.map(n=>({id:n.id,x:n.x,z:n.z}));
 return {
  root,roofs,npcMarkers,batching,groundDetails,perimeter:CLASSIC_PERIMETER,
  update(time,action=null,trees=[]){
    ribbons.forEach((r,i)=>{r.rotation.z=Math.sin(time*1.4+i)*.07;r.rotation.y=Math.sin(time*.9+i)*.15;});
    const states=new Map(trees.map(s=>[s.id,s]));
    for(const [id,visual] of groveVisuals)
     applySkillTreeVisual(visual.tree,visual.stump,states.get(id),action,time);
   },
  updateCutaway(insideId){
   for(const item of roofs)item.roofs.visible=item.id!==insideId;
  },
  dispose(){
   scene.remove(root);
   root.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();});
  }
 };
}
