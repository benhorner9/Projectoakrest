import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createClassicTerrain} from '../src/classic-terrain-view.js';
import {CLASSIC_PLAZAS,CLASSIC_ROADS} from '../src/classic-town-plan.js';
import {plazaOutline,organicRoadPolygons} from '../src/classic-art-direction.js';

test('Oakrest town removes the repeated square paving pattern entirely',()=>{
 const group=new THREE.Group(),ground=createClassicTerrain(group);
 assert.equal(ground.stones,0,'no square floor tiles');
 assert.equal(group.children.filter(x=>x.isInstancedMesh).length,0,'no instanced paving blocks');
 assert.ok(ground.ground.attributes.position.count>2000,'retain gently varied meadow terrain');
 assert.ok(ground.gravel>20,'sparse irregular trail gravel is not square floor paving');
 assert.ok(group.children.filter(x=>x.isMesh).length<=10,'terrain bands remain bounded and batchable');
 assert.equal(group.children.filter(x=>x.name==='oakrest-packed-earth-paths').length,1);
 assert.equal(group.children.filter(x=>x.name==='oakrest-market-clearing').length,1);
});
test('main town paths and common use the authentic irregular road/plaza geometry',()=>{
 const trails=organicRoadPolygons(CLASSIC_ROADS),verges=organicRoadPolygons(CLASSIC_ROADS,5.5);
 assert.ok(trails.length>20);
 assert.equal(trails.length,verges.length);
 for(const p of CLASSIC_PLAZAS){
  const outline=plazaOutline(p);
  assert.ok(outline.length>=24,'commons need smoothly irregular outlines, not squares or octagons');
  assert.ok(new Set(outline.map(point=>point.join(','))).size>=24);
 }
});
