import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {block1TerrainTones} from '../src/classic-art-direction.js';
import {block1EcologyAllowed,generateBlock1Ecology,addBlock1Ecology} from '../src/classic-block1-ecology.js';
import {addBlock1BuildingIdentity} from '../src/classic-block1-architecture.js';
import {createClassicTerrain} from '../src/classic-terrain-view.js';
import {OAKREST_BUILDINGS} from '../src/town-layout.js';

test('Visual Block 1: ecological zones are deterministic, safe and actually populated',()=>{
 for(const zone of ['town','woodland']){
  const first=generateBlock1Ecology(zone),again=generateBlock1Ecology(zone);
  assert.deepEqual(first,again,zone+' placement must not wander on reload');
  const all=Object.values(first).flat();
  assert.ok(all.length>25&&all.length<500,zone+' sparse world dressing count '+all.length);
  for(const p of all){
   assert.ok(block1EcologyAllowed(zone,p.x,p.z),zone+' placed object across road/building/quest');
   assert.ok(p.scale>.6&&p.scale<1.13);
   assert.ok(Number.isFinite(p.angle));
  }
 }
 assert.equal(block1EcologyAllowed('town',0,39),false,'market square remains open');
 assert.equal(block1EcologyAllowed('woodland',0,94),false,'northern gate path remains open');
 assert.equal(block1EcologyAllowed('woodland',0,181),false,'Hollow entrance remains clear');
 assert.equal(block1EcologyAllowed('woodland',NaN,101),false);
 assert.throws(()=>generateBlock1Ecology('dungeon'),/Invalid ecology/);
});

test('Visual Block 1: town and wilderness shrubs, fern, leaf and stone batches cost at most 4 draws per zone',()=>{
 for(const zone of ['town','woodland']){
  const root=new THREE.Group(),result=addBlock1Ecology(root,zone);
  assert.equal(root.children.length,1);
  assert.ok(result.draws>=2&&result.draws<=4,zone+' draw-call limit');
  assert.deepEqual(result.counts,root.children[0].userData.counts);
  const expected=Object.values(result.counts).reduce((n,x)=>n+x,0);
  assert.equal(root.children[0].children.reduce((n,x)=>n+x.count,0),expected);
  for(const m of root.children[0].children){
   assert.ok(m.isInstancedMesh);
   assert.equal(m.userData.decorativeOnly,true);
   assert.equal(m.castShadow,false);
   assert.ok(m.boundingSphere?.radius>=0);
   for(let i=0;i<m.count;i++){
    const matrix=new THREE.Matrix4();m.getMatrixAt(i,matrix);
    assert.ok(matrix.elements.every(Number.isFinite));
   }
   m.geometry.dispose();m.material.dispose();
  }
 }
});

test('Visual Block 1: each existing building family adds roof-cutaway-safe details without blocking door',()=>{
 const types=new Set();
 for(const [index,b] of OAKREST_BUILDINGS.entries()){
  const house=new THREE.Group(),roofs=new THREE.Group();house.add(roofs);
  const mats=Object.fromEntries(['brass','trim','wood','stone','roofDetail','darkwood','leaf'].map(k=>
   [k,new THREE.MeshLambertMaterial({color:'#a5a087'})]));
  const box=new THREE.BoxGeometry(1,1,1);
  const cube=(g,m,x,y,z,w,h,d)=>{
   const part=new THREE.Mesh(box,m);part.position.set(x,y,z);part.scale.set(w,h,d);g.add(part);return part;
  };
  const mesh=(g,geo,m,x,y,z,sx,sy,sz)=>{
   const part=new THREE.Mesh(geo,m);part.position.set(x,y,z);part.scale.set(sx,sy,sz);g.add(part);return part;
  };
  const result=addBlock1BuildingIdentity({building:b,index,house,roofs,mat:mats,cube,mesh});
  types.add(result.family);
  assert.ok(result.parts>=23,b.id+' needs architectural identity');
  assert.equal(result.cutaway,true);
  assert.ok(roofs.children.length>=22,'all gable/shingle decorations should belong to roof');
  for(const el of house.children.filter(x=>x.isMesh)){
   assert.ok(Math.abs(el.position.x)>1.55||el.position.y>3.2,
    b.id+' decorative front piece must not obstruct doorway');
  }
  roofs.visible=false;
  assert.equal(roofs.children.every(x=>x.visible&&x.parent===roofs),true);
  assert.equal(house.children.filter(x=>x.isMesh).length>0,true);
  roofs.visible=true;
  assert.equal(roofs.visible,true);
  box.dispose();Object.values(mats).forEach(x=>x.dispose());
 }
 assert.ok(types.has('civic')&&types.has('merchant')&&types.has('homestead'));
});

test('Visual Block 1: brighter terrain weights vary naturally but physics floor is never raised',()=>{
 const a=block1TerrainTones(3,25),b=block1TerrainTones(-19,165);
 assert.notDeepEqual(a,b);
 for(const point of [a,b,block1TerrainTones(0,0),block1TerrainTones(-100,900)])
  for(const n of Object.values(point))assert.ok(n>=0&&n<=1&&Number.isFinite(n));
 const root=new THREE.Group(),terrain=createClassicTerrain(root);
 const pos=terrain.ground.attributes.position,colors=terrain.ground.attributes.color;
 assert.equal(colors.count,pos.count);
 let minY=Infinity,maxY=-Infinity,minGreen=Infinity,maxGreen=-Infinity;
 for(let i=0;i<pos.count;i++){
  minY=Math.min(minY,pos.getY(i));maxY=Math.max(maxY,pos.getY(i));
  minGreen=Math.min(minGreen,colors.getY(i));maxGreen=Math.max(maxGreen,colors.getY(i));
 }
 assert.ok(maxY<0&&maxY-minY<.04,'no above-ground steps can block movement');
 assert.ok(maxGreen-minGreen>.01,'coloured meadows should not be a flat green carpet');
 assert.ok(root.children.length<=10,'terrain still batched');
});
