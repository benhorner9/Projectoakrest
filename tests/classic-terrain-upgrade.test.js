import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CLASSIC_ROADS,CLASSIC_PLAZAS} from '../src/classic-town-plan.js';
import {terrainVariation,terrainPatch,organicRoadPolygons,trailDetailPolygons,plazaOutline} from '../src/classic-art-direction.js';
import {createClassicTerrain} from '../src/classic-terrain-view.js';

const roundPoint=p=>p.map(n=>Math.round(n*1e5)/1e5);
test('road strips are continuous at joins across every road width and preserve all source routes',()=>{
 const before=JSON.stringify(CLASSIC_ROADS);
 for(const width of [2.55,4.65,6.25,7.3]){
  const polys=organicRoadPolygons(CLASSIC_ROADS,width);
  assert.ok(polys.length>100,'each natural path layer covers town network');
  assert.ok(polys.every(q=>q.length===4&&q.flat().every(Number.isFinite)));
  // A multi-bend route should share exact cross-section endpoints, not leave gaps.
  const bend=organicRoadPolygons([[[0,0],[0,10],[10,10]]],width);
  for(let i=0;i<bend.length-1;i++){
   assert.deepEqual(roundPoint(bend[i][1]),roundPoint(bend[i+1][0]),'left edge continuous');
   assert.deepEqual(roundPoint(bend[i][2]),roundPoint(bend[i+1][3]),'right edge continuous');
  }
 }
 assert.equal(JSON.stringify(CLASSIC_ROADS),before,'surface generation must not mutate gameplay roads');
});
test('woodland hue and road detailing remain deterministic, finite and sparse',()=>{
 for(let x=-45;x<45;x+=3)for(let z=-18;z<92;z+=7){
  const n=terrainVariation(x,z),p=terrainPatch(x,z);
  assert.ok(n>=0&&n<=1&&p>=0&&p<=1);
  assert.equal(n,terrainVariation(x,z));assert.equal(p,terrainPatch(x,z));
 }
 const details=trailDetailPolygons(CLASSIC_ROADS);
 assert.deepEqual(details,trailDetailPolygons(CLASSIC_ROADS));
 assert.ok(details.gravel.length>20&&details.gravel.length<1000);
 assert.ok(details.worn.length>1&&details.worn.length<200);
 for(const q of [...details.gravel,...details.worn])assert.ok(q.flat().every(Number.isFinite));
});
test('low-draw-call 2.5D terrain has distinct readable path surfaces and organic commons',()=>{
 const root=new THREE.Group(),out=createClassicTerrain(root);
 assert.ok(out.roadBands>=4);
 assert.ok(root.children.length<=10,'terrain material layers stay under ten batchable meshes');
 assert.ok(root.children.every(m=>m.isMesh));
 assert.ok(root.children.some(m=>m.name==='oakrest-natural-meadow'));
 assert.ok(root.children.some(m=>m.name==='oakrest-packed-earth-paths'));
 assert.ok(root.children.some(m=>m.name==='oakrest-irregular-trail-gravel'));
 const geometry=out.ground;
 const positions=geometry.attributes.position;
 let minY=Infinity,maxY=-Infinity;
 for(let i=0;i<positions.count;i++){const y=positions.getY(i);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 assert.ok(maxY<0,'ground remains below physics plane: no terrain clipping');
 assert.ok(maxY-minY<.04,'undulation cannot invalidate navigation');
 assert.ok(CLASSIC_PLAZAS.every(p=>plazaOutline(p).length>=24));
 assert.equal(root.children.find(m=>m.name==='oakrest-packed-earth-paths').material.color.getHexString().length,6);
 for(const m of root.children){m.geometry.dispose();m.material.dispose();}
});
