import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainVariation,classicPixelRatio,organicRoadPolygons,plazaOutline} from '../src/classic-art-direction.js';
import {CLASSIC_ROADS,CLASSIC_PLAZAS} from '../src/classic-town-plan.js';
test('terrain is deterministic and rendering density stays within tablet pixel budget',()=>{
 for(let x=-53;x<53;x+=7)for(let z=-24;z<98;z+=9){
  const n=terrainVariation(x,z);assert.ok(n>=0&&n<=1);assert.equal(n,terrainVariation(x,z));
 }
 for(const [w,h,dpr] of [[1366,1024,2],[2732,2048,2],[820,630,1],[1024,768,NaN]]){
  const r=classicPixelRatio(w,h,dpr);assert.ok(Number.isFinite(r));assert.ok(r<=1.5&&r>=.75);
  if(w*h<2666666)assert.ok(w*h*r*r<=1500001);
 }
});
test('organic roads preserve endpoints and shared map geometry without mutating path data',()=>{
 const before=JSON.stringify(CLASSIC_ROADS),quads=organicRoadPolygons(CLASSIC_ROADS);
 assert.ok(quads.length>100);assert.equal(JSON.stringify(CLASSIC_ROADS),before);
 for(const q of quads){assert.equal(q.length,4);assert.ok(q.flat().every(Number.isFinite));}
 const simple=organicRoadPolygons([[[0,0],[0,10]]]);
 assert.equal(simple[0][0][1],0);assert.equal(simple.at(-1)[1][1],10);
 assert.ok(simple.every(q=>q[0][0]<-1.8&&q[3][0]>1.8));
 for(const p of CLASSIC_PLAZAS)assert.equal(plazaOutline(p).length,8);
});
