/** Oakrest's first *actual* skinned humanoid, authored from scratch for #84.
 * Built as one weighted low-poly mesh around a stable 28-joint skeleton.
 * AnimationMixer samples real AnimationClips. No root motion or save writes.
 * This is a visual test rig, not an approved player/NPC replacement.
 */
import * as THREE from 'three';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const palette={
 skin:'#d3a587',shirt:'#59736e',trousers:'#555549',leather:'#6c5540',
 boot:'#3e403d',hair:'#3c302b',steel:'#869296',trim:'#bda77e',
 eye:'#222a2b',cloth:'#8a6554',wood:'#6c5036',silver:'#b8c4c1'
};
const rest={
 Root:[0,0,0],Hips:[0,1.03,0],Spine:[0,1.33,0],Chest:[0,1.73,0],
 Neck:[0,1.97,0],Head:[0,2.17,0],
 LeftShoulder:[-.43,1.76,0],LeftUpperArm:[-.55,1.72,0],
 LeftLowerArm:[-.78,1.44,0],LeftHand:[-.99,1.19,0],
 LeftThumb:[-1.03,1.14,-.08],LeftIndex:[-1.05,1.10,-.045],
 RightShoulder:[.43,1.76,0],RightUpperArm:[.55,1.72,0],
 RightLowerArm:[.78,1.44,0],RightHand:[.99,1.19,0],
 RightThumb:[1.03,1.14,-.08],RightIndex:[1.05,1.10,-.045],
 LeftUpperLeg:[-.20,1.00,0],LeftLowerLeg:[-.21,.57,0],
 LeftFoot:[-.21,.15,0],LeftToe:[-.21,.075,-.18],
 RightUpperLeg:[.20,1.00,0],RightLowerLeg:[.21,.57,0],
 RightFoot:[.21,.15,0],RightToe:[.21,.075,-.18]
};
const parent={
 Hips:'Root',Spine:'Hips',Chest:'Spine',Neck:'Chest',Head:'Neck',
 LeftShoulder:'Chest',LeftUpperArm:'LeftShoulder',LeftLowerArm:'LeftUpperArm',
 LeftHand:'LeftLowerArm',LeftThumb:'LeftHand',LeftIndex:'LeftHand',
 RightShoulder:'Chest',RightUpperArm:'RightShoulder',RightLowerArm:'RightUpperArm',
 RightHand:'RightLowerArm',RightThumb:'RightHand',RightIndex:'RightHand',
 LeftUpperLeg:'Hips',LeftLowerLeg:'LeftUpperLeg',LeftFoot:'LeftLowerLeg',LeftToe:'LeftFoot',
 RightUpperLeg:'Hips',RightLowerLeg:'RightUpperLeg',RightFoot:'RightLowerLeg',RightToe:'RightFoot'
};
const hex=s=>new THREE.Color(s);
const clamp=x=>Math.max(0,Math.min(1,x));
function authorGeometry(index){
 const pos=[],skin=[],weight=[],colors=[],faces=[];
 const colorCache=new Map();
 function point(p,bone1,bone2,blend,color){
  const c=colorCache.get(color)||hex(color);
  colorCache.set(color,c);
  pos.push(p.x,p.y,p.z);
  skin.push(index.get(bone1),index.get(bone2||bone1),0,0);
  weight.push(1-blend,blend,0,0);
  colors.push(c.r,c.g,c.b);
  return pos.length/3-1;
 }
 function tube(a,b,rx0,rz0,rx1,rz1,j0,j1,color,rings=5,sides=8){
  const p=V(...a),q=V(...b),axis=q.clone().sub(p).normalize();
  let u=V(0,0,1).cross(axis).normalize();
  if(u.lengthSq()<.1)u=V(1,0,0);
  const v=axis.clone().cross(u).normalize();
  const sections=[];
  for(let k=0;k<=rings;k++){
   const t=k/rings,r0=rx0+(rx1-rx0)*t,r1=rz0+(rz1-rz0)*t;
   const centre=p.clone().lerp(q,t),row=[];
   for(let i=0;i<sides;i++){
    const phi=i/sides*Math.PI*2;
    const loc=centre.clone().addScaledVector(u,Math.cos(phi)*r0).addScaledVector(v,Math.sin(phi)*r1);
    row.push(point(loc,j0,j1,t*t*(3-2*t),color));
   }
   sections.push(row);
  }
  for(let k=0;k<rings;k++)for(let i=0;i<sides;i++){
   const j=(i+1)%sides,a=sections[k][i],b=sections[k][j],c=sections[k+1][i],d=sections[k+1][j];
   faces.push(a,c,b,b,c,d);
  }
  // Caps are intentionally inset to avoid visible holes at extremities.
  const first=point(p,j0,j0,0,color),last=point(q,j1,j1,0,color);
  for(let i=0;i<sides;i++){
   const j=(i+1)%sides;
   faces.push(first,sections[0][j],sections[0][i]);
   faces.push(last,sections[rings][i],sections[rings][j]);
  }
 }
 function ellipsoid(cx,cy,cz,rx,ry,rz,bone,color,lat=5,lon=8){
  const rows=[];
  for(let j=0;j<=lat;j++){
   const theta=Math.PI*j/lat,row=[];
   for(let i=0;i<lon;i++){
    const phi=i*2*Math.PI/lon;
    row.push(point(V(cx+rx*Math.sin(theta)*Math.cos(phi),cy+ry*Math.cos(theta),
     cz+rz*Math.sin(theta)*Math.sin(phi)),bone,bone,0,color));
   }
   rows.push(row);
  }
  for(let j=0;j<lat;j++)for(let i=0;i<lon;i++){
   const n=(i+1)%lon;faces.push(rows[j][i],rows[j+1][i],rows[j][n]);
   faces.push(rows[j][n],rows[j+1][i],rows[j+1][n]);
  }
 }
 // Mesh silhouettes are built in the *rest pose*, not hung from pivot meshes.
 tube([0,1.01,0],[0,1.73,0],.31,.22,.38,.23,'Hips','Chest',palette.shirt,7);
 tube([0,1.01,0],[0,1.09,0],.29,.23,.30,.25,'Hips','Hips',palette.leather,1);
 tube([0,1.79,0],[0,2.0,0],.11,.11,.10,.10,'Chest','Neck',palette.skin,2);
 ellipsoid(0,2.18,-.013,.255,.306,.234,'Head',palette.skin,7,10);
 ellipsoid(0,2.415,.085,.262,.12,.220,'Head',palette.hair,4,10);
 // A natural hairline, brows and an understated nose point down the -Z axis.
 ellipsoid(0,2.17,-.24,.063,.082,.055,'Head',palette.skin,4);
 for(const x of [-.095,.095]){
  ellipsoid(x,2.245,-.217,.023,.028,.012,'Head',palette.eye,3,6);
  ellipsoid(x,2.30,-.212,.058,.018,.02,'Head',palette.hair,3,6);
 }
 ellipsoid(0,2.045,-.219,.072,.014,.015,'Head',palette.leather,3,6);
 for(const s of [-1,1]){
  const side=s<0?'Left':'Right';
  const shoulder=[s*.55,1.72,0],elbow=[s*.78,1.44,0],hand=[s*.99,1.19,0];
  tube([s*.43,1.76,0],elbow,.175,.17,.132,.132,
   side+'Shoulder',side+'LowerArm',palette.shirt,5);
  tube(elbow,hand,.135,.135,.090,.094,side+'LowerArm',side+'Hand',palette.skin,5);
  ellipsoid(s*1.00,1.155,-.02,.107,.138,.065,side+'Hand',palette.skin);
  // Five-finger silhouette for the hand at ordinary game-camera distance.
  for(let k=0;k<4;k++)ellipsoid(s*(1.032+k*.013),1.08,-.075+k*.038,
    .027,.080,.025,side+'Index',palette.skin,3,5);
  ellipsoid(s*1.055,1.11,-.105,.040,.085,.041,side+'Thumb',palette.skin);
  // Small shoulder guard and cuff fit the same weighted skin; no floating plates.
  ellipsoid(s*.51,1.68,-.01,.21,.105,.21,side+'Shoulder',palette.leather);
  tube([s*.73,1.50,0],[s*.80,1.405,0],.144,.145,.135,.132,
    side+'LowerArm',side+'LowerArm',palette.leather,2);
  const hip=[s*.20,1.00,0],knee=[s*.21,.57,0],foot=[s*.21,.15,0];
  tube(hip,knee,.205,.195,.154,.14,side+'UpperLeg',side+'LowerLeg',palette.trousers,6);
  tube(knee,foot,.155,.15,.124,.125,side+'LowerLeg',side+'Foot',palette.trousers,6);
  tube([s*.21,.32,0],[s*.21,.14,0],.153,.157,.16,.162,
    side+'LowerLeg',side+'Foot',palette.boot,3);
  ellipsoid(s*.21,.13,-.075,.18,.125,.285,side+'Foot',palette.boot,5,10);
 }
 // Belt, hanging leather belt-ends and bronze fastener.
 tube([0,1.08,0],[0,1.14,0],.318,.241,.324,.238,'Hips','Spine',palette.leather,2);
 ellipsoid(0,1.10,-.25,.075,.045,.035,'Hips',palette.trim);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skin,4));
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weight,4));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setIndex(faces);g.computeVertexNormals();
 return g;
}
const q=(x=0,y=0,z=0)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ'));
function rotationTrack(name,frames){
 const times=[],values=[];
 for(const [t,x=0,y=0,z=0] of frames){times.push(t);values.push(...q(x,y,z).toArray());}
 return new THREE.QuaternionKeyframeTrack(name+'.quaternion',times,values);
}
function track(name,duration,entries){
 return new THREE.AnimationClip(name,duration,Object.entries(entries).map(([bone,frames])=>rotationTrack(bone,frames)));
}
function cycle(a,b,c,d=0){
 return [[0,a,0,d],[.25,b,0,d],[.5,a,0,d],[.75,c,0,d],[1,a,0,d]];
}
export function buildOakrestClips(){
 const clips=[];
 function add(name,dur,body){clips.push(track(name,dur,body));}
 const basic={
  Hips:cycle(0,.027,0),Spine:cycle(0,-.018,0),
  Chest:cycle(0,.027,0),Head:cycle(0,-.018,0),
  LeftUpperArm:cycle(0,.012,0,-.02),RightUpperArm:cycle(0,-.012,0,.02)
 };
 add('Idle',2.4,basic);
 add('Ready',1.4,{...basic,RightUpperArm:cycle(.25,.30,.25,.24),
  LeftUpperArm:cycle(.25,.3,.25,-.24)});
 function gait(name,dur,amp){
  add(name,dur,{Hips:cycle(0,.035,0),
   LeftUpperLeg:cycle(0,-amp,amp),RightUpperLeg:cycle(0,amp,-amp),
   LeftLowerLeg:cycle(0,-amp*.16,amp*.38),RightLowerLeg:cycle(0,amp*.38,-amp*.16),
   LeftUpperArm:cycle(0,amp*.60,-amp*.60),
   RightUpperArm:cycle(0,-amp*.60,amp*.60),
   Chest:cycle(0,.025,0)});
 }
 gait('Walk',.86,.55);gait('Run',.58,.86);
 add('StrafeLeft',.86,{LeftUpperLeg:cycle(0,0,.48,-.24),
  RightUpperLeg:cycle(0,0,-.48,.24),LeftUpperArm:cycle(0,.18,-.18),
  RightUpperArm:cycle(0,-.18,.18)});
 add('StrafeRight',.86,{LeftUpperLeg:cycle(0,0,-.48,.24),
  RightUpperLeg:cycle(0,0,.48,-.24),LeftUpperArm:cycle(0,-.18,.18),
  RightUpperArm:cycle(0,.18,-.18)});
 add('Backstep',.82,{LeftUpperLeg:cycle(0,.4,-.4),
  RightUpperLeg:cycle(0,-.4,.4),LeftUpperArm:cycle(0,-.24,.24),
  RightUpperArm:cycle(0,.24,-.24)});
 add('SwordSlash',.86,{Chest:[[0,0,0,0],[.25,0,-.28,-.12],[.47,0,.5,.18],[.86,0,0,0]],
  RightUpperArm:[[0,.28,0,.18],[.25,-1.45,.27,.45],[.47,1.05,-.48,-.8],[.86,.28,0,.18]],
  RightLowerArm:[[0,0,0,0],[.25,-.7,0,0],[.47,.35,0,0],[.86,0,0,0]],
  LeftUpperArm:[[0,.12,0,-.15],[.4,.4,0,-.15],[.86,.12,0,-.15]]});
 add('GreatswordStrike',1.2,{Chest:[[0,0,0,0],[.45,-.24,-.32,0],[.68,.28,.48,0],[1.2,0,0,0]],
  RightUpperArm:[[0,.25,0,0],[.45,-1.6,0,.5],[.68,1.25,0,-.25],[1.2,.25,0,0]],
  LeftUpperArm:[[0,.2,0,0],[.45,-1.4,0,-.5],[.68,1.15,0,.25],[1.2,.2,0,0]]});
 add('DaggerCombo',.9,{RightUpperArm:[[0,.2,0,0],[.23,.75,0,-.3],[.46,-.45,0,.3],[.7,.88,0,-.3],[.9,.2,0,0]],
  LeftUpperArm:[[0,.18,0,0],[.23,-.3,0,.3],[.46,.87,0,-.3],[.7,-.2,0,.3],[.9,.18,0,0]],
  Chest:[[0,0,0,0],[.23,0,.18,0],[.46,0,-.18,0],[.9,0,0,0]]});
 add('BowDraw',1.25,{
  LeftUpperArm:[[0,.1,0,-.1],[.3,1.1,0,-.3],[.78,1.1,0,-.3],[1.25,.1,0,-.1]],
  RightUpperArm:[[0,.1,0,.1],[.3,.9,-.35,.7],[.78,1.15,-.62,1.1],[1.25,.1,0,.1]],
  RightLowerArm:[[0,0,0,0],[.3,-.45,0,0],[.78,-1.1,0,0],[1.25,0,0,0]]});
 add('CrossbowFire',1.0,{RightUpperArm:[[0,.25,0,0],[.25,1.0,0,0],[.63,.9,0,0],[1,.25,0,0]],
  LeftUpperArm:[[0,.25,0,0],[.25,1.0,0,0],[.63,.9,0,0],[1,.25,0,0]],
  Chest:[[0,0,0,0],[.25,-.10,0,0],[.63,.12,0,0],[1,0,0,0]]});
 add('StaffCast',1.17,{RightUpperArm:[[0,.1,0,0],[.4,-1.15,0,.15],[.7,.8,0,0],[1.17,.1,0,0]],
  LeftUpperArm:[[0,.1,0,0],[.4,-.55,0,-.45],[.7,-1.1,0,-.5],[1.17,.1,0,0]],
  Chest:[[0,0,0,0],[.4,-.12,.20,0],[.7,.12,-.20,0],[1.17,0,0,0]]});
 add('WandCast',.92,{RightUpperArm:[[0,.1,0,0],[.25,.85,0,.12],[.6,1.3,0,.12],[.92,.1,0,0]],
  RightLowerArm:[[0,0,0,0],[.25,-.35,0,0],[.6,-.75,0,0],[.92,0,0,0]],
  LeftUpperArm:[[0,.1,0,0],[.4,.28,0,-.18],[.92,.1,0,0]]});
 add('Guard',1.0,{RightUpperArm:[[0,.15,0,0],[.28,.95,0,.4],[.75,.95,0,.4],[1,.15,0,0]],
  LeftUpperArm:[[0,.15,0,0],[.28,1.0,0,-.4],[.75,1.0,0,-.4],[1,.15,0,0]]});
 add('Hit',.54,{Chest:[[0,0,0,0],[.12,-.35,0,.12],[.31,.08,0,-.08],[.54,0,0,0]],
  Head:[[0,0,0,0],[.12,-.2,0,0],[.54,0,0,0]]});
 add('Dodge',.8,{Hips:[[0,0,0,0],[.25,.6,0,-.16],[.45,-.65,0,.16],[.8,0,0,0]],
  LeftUpperLeg:[[0,0,0,0],[.25,.8,0,0],[.45,-.6,0,0],[.8,0,0,0]],
  RightUpperLeg:[[0,0,0,0],[.25,-.7,0,0],[.45,.8,0,0],[.8,0,0,0]]});
 add('Death',1.25,{Hips:[[0,0,0,0],[.5,-.4,0,0],[1.25,-1.25,0,0]],
  LeftUpperLeg:[[0,0,0,0],[1.25,.45,0,0]],
  RightUpperLeg:[[0,0,0,0],[1.25,-.35,0,0]],
  LeftUpperArm:[[0,0,0,0],[1.25,-1.1,0,-.28]],
  RightUpperArm:[[0,0,0,0],[1.25,-1.2,0,.28]]});
 add('Woodcut',1.15,{RightUpperArm:[[0,.2,0,0],[.5,-1.3,0,0],[.72,1.25,0,0],[1.15,.2,0,0]],
  LeftUpperArm:[[0,.2,0,0],[.5,-1.15,0,0],[.72,1.1,0,0],[1.15,.2,0,0]]});
 return clips;
}
function lowPoly(material,geometry,position,rotation){
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:material,roughness:.72,metalness:material===palette.steel?.45:0,flatShading:true}));
 mesh.position.set(...position);
 if(rotation)mesh.rotation.set(...rotation);
 mesh.castShadow=true;return mesh;
}
export function makeRigWeapon(type){
 const group=new THREE.Group();
 if(type==='none')return group;
 const sword=['sword','greatsword','dagger','axe'].includes(type);
 if(sword){
  const long=type==='greatsword',dagger=type==='dagger',axe=type==='axe';
  group.add(lowPoly(palette.wood,new THREE.CylinderGeometry(.035,.045,.30,7),[0,-.04,-.04]));
  group.add(lowPoly(palette.trim,new THREE.BoxGeometry(.34,.06,.07),[0,-.19,-.04]));
  if(axe){
   group.add(lowPoly(palette.steel,new THREE.BoxGeometry(.33,.29,.075),[.10,-.47,-.04]));
  }else{
   const length=dagger?.40:long?1.38:.90;
   group.add(lowPoly(palette.silver,new THREE.BoxGeometry(dagger?.09:.15,length,.052),
    [0,-.26-length*.5,-.04]));
   group.add(lowPoly(palette.trim,new THREE.ConeGeometry(dagger?.055:.09,.20,4),
    [0,-.26-length-.10,-.04],[0,0,Math.PI]));
  }
 }else if(['bow','crossbow'].includes(type)){
  const bow=lowPoly(palette.wood,new THREE.TorusGeometry(.46,.036,6,16,Math.PI),
    [0,-.16,0],[0,Math.PI/2,Math.PI/2]);group.add(bow);
  group.add(lowPoly(palette.trim,new THREE.CylinderGeometry(.008,.008,.93,5),[0,-.16,0]));
  if(type==='crossbow')group.add(lowPoly(palette.wood,new THREE.BoxGeometry(.13,.15,.8),[0,-.16,-.2]));
 }else if(['staff','wand'].includes(type)){
  const length=type==='wand'?.42:1.65;
  group.add(lowPoly(palette.wood,new THREE.CylinderGeometry(.036,.045,length,7),[0,-length*.45,0]));
  group.add(lowPoly('#80bbb0',new THREE.OctahedronGeometry(type==='wand'?.075:.12),[0,-length,0]));
 }
 return group;
}
export function createSkinnedOakrestHero(){
 const root=new THREE.Group();root.name='OakrestSkinnedPrototype';
 const names=Object.keys(rest),byName=new Map(),bones=[];
 for(const name of names){
  const b=new THREE.Bone();b.name=name;
  const absolute=V(...rest[name]),p=parent[name]?V(...rest[parent[name]]):V(0,0,0);
  b.position.copy(absolute.sub(p));byName.set(name,b);bones.push(b);
 }
 for(const name of names){
  const b=byName.get(name),parentBone=byName.get(parent[name]);
  if(parentBone)parentBone.add(b);else root.add(b);
 }
 const geometry=authorGeometry(new Map(names.map((name,i)=>[name,i])));
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:0,flatShading:true,side:THREE.DoubleSide}));
 mesh.name='WeightedCharacter';mesh.castShadow=true;mesh.frustumCulled=false;root.add(mesh);
 root.updateMatrixWorld(true);
 mesh.bind(new THREE.Skeleton(bones));
 const equipment=new THREE.Group();equipment.name='WeaponGrip';
 byName.get('RightHand').add(equipment);
 const clips=buildOakrestClips(),mixer=new THREE.AnimationMixer(root);
 let current=null,weapon='none';
 function play(name,fade=.18){
  const clip=clips.find(c=>c.name===name);
  if(!clip)throw Error('Unknown skeletal clip '+name);
  const next=mixer.clipAction(clip);
  if(current===next)return next;
  next.enabled=true;next.reset().setEffectiveWeight(1).play();
  if(name==='Death')next.setLoop(THREE.LoopOnce,1).clampWhenFinished=true;
  else next.setLoop(THREE.LoopRepeat,Infinity);
  if(current){current.fadeOut(fade);next.fadeIn(fade);}
  current=next;return next;
 }
 function equip(type){
  if(!['none','sword','greatsword','dagger','axe','bow','crossbow','staff','wand'].includes(type))throw Error('Unknown equipment '+type);
  equipment.clear();equipment.add(makeRigWeapon(type));
  weapon=type;return equipment;
 }
 play('Idle',0);
 return {root,mesh,skeleton:mesh.skeleton,bones:byName,clips,mixer,play,equip,equipment,
   update:dt=>mixer.update(Math.max(0,Math.min(.1,dt))),
   dispose:()=>{mixer.stopAllAction();geometry.dispose();mesh.material.dispose();
    equipment.traverse(x=>{x.geometry?.dispose();x.material?.dispose();});},
   get equipped(){return weapon;}
 };
}
