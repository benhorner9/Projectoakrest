/** Authored, mirrored hands. One shared morph mesh per side, four fingers and
 * an opposed thumb. The empty centre is the grip socket; the wrist is 0.08 units
 * above it. Morphs alter skin only, never the socket or an action clock. */
import * as THREE from 'three';
const cache=new Map(),box=new THREE.BoxGeometry(1,1,1).toNonIndexed();
const axis=new THREE.Vector3(0,1,0);
function geometryFor(side,pose){
 const positions=[],normals=[],v=new THREE.Vector3(),q=new THREE.Quaternion();
 function segment(a,b,width,depth){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
  const length=direction.length(),centre=start.add(end).multiplyScalar(.5);
  q.setFromUnitVectors(axis,direction.normalize());
  for(let i=0;i<box.attributes.position.count;i++){
   v.fromBufferAttribute(box.attributes.position,i).multiply(new THREE.Vector3(width,length,depth)).applyQuaternion(q).add(centre);positions.push(v.x,v.y,v.z);
   v.fromBufferAttribute(box.attributes.normal,i).applyQuaternion(q);normals.push(v.x,v.y,v.z);
  }
 }
 segment([0,.061,0],[0,.112,0],.13,.174);
 for(let finger=0;finger<4;finger++){
  const z=-.066+finger*.044,scale=finger===3?.86:finger===0?.94:1;
  const grip=[[.065,.065],[.090,-.015],[.027,-.085],[-.054,-.065]];
  const open=[[.065,.065],[.052,-.015],[.035,-.080],[.020,-.135]];
  const draw=[[.065,.065],[.057,-.012],[.015,-.055],[-.020,-.028]];
  const points=(pose==='grip'?grip:pose==='draw'&&finger<3?draw:open).map(([x,y])=>[x*side,y*scale,z]);
  for(let i=0;i<3;i++)segment(points[i],points[i+1],.033-i*.003,.034-i*.002);
 }
 const thumb=pose==='grip'?[[ -.057,.078,.096],[-.085,.015,.068],[-.060,-.035,.015]]:
  [[-.057,.078,.096],[-.093,.020,.095],[-.083,-.020,.065]];
 for(let i=0;i<2;i++)segment(thumb[i].map((n,j)=>j===0?n*side:n),thumb[i+1].map((n,j)=>j===0?n*side:n),.040-i*.004,.043-i*.003);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 return geometry;
}
export function createHumanoidHand(material,side){
 if(!cache.has(side)){
  const geometry=geometryFor(side,'open'),grip=geometryFor(side,'grip'),draw=geometryFor(side,'draw');
  geometry.morphAttributes.position=[grip.attributes.position,draw.attributes.position];geometry.morphAttributes.normal=[grip.attributes.normal,draw.attributes.normal];
  geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.sharedHumanoidShape=true;cache.set(side,geometry);
 }
 const mesh=new THREE.Mesh(cache.get(side),material);mesh.name='humanoid.hand-skin';mesh.castShadow=true;return mesh;
}
export function poseHumanoidHands(u,profile,info){
 for(const side of ['left','right']){
  const mesh=u[side+'HandSkin'];if(!mesh)continue;
  const draw=!!profile?.draw&&side==='right';
  const held=profile&&(side===profile.primary||!!profile.secondary&&side==='left'||u.family==='daggers'||side==='left'&&u.offhand.children.length>0);
  const blend=info.sample||!u.foundationPosed?1:1-Math.exp(-24*Math.max(0,Math.min(.1,info.dt||0)));
  for(let i=0;i<2;i++){const target=i===0?held&&!draw?1:0:draw?1:0;mesh.morphTargetInfluences[i]+=(target-mesh.morphTargetInfluences[i])*blend;}
 }
}
