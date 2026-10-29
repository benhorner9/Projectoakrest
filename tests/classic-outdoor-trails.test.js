import test from 'node:test';
import assert from 'node:assert/strict';
import {OUTDOOR_TRAIL_KNOTS,OUTDOOR_TRAILS,smoothOutdoorTrail} from '../src/classic-outdoor-trails.js';
import {ADVENTURE_PATHS,ADVENTURE_TREES,ADVENTURE_TARGETS} from '../src/adventure-content.js';
import {organicRoadPolygons} from '../src/classic-art-direction.js';
const gap=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const segmentDistance=(p,a,b)=>{
 const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;
 const t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/den)):0;
 return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);
};
test('woodland paths preserve real locations with no hard direction changes',()=>{
 assert.ok(OUTDOOR_TRAILS.length>=7);
 for(let i=0;i<OUTDOOR_TRAILS.length;i++){
  const path=OUTDOOR_TRAILS[i],knots=OUTDOOR_TRAIL_KNOTS[i];
  assert.deepEqual(path[0],knots[0]);assert.deepEqual(path.at(-1),knots.at(-1));
  for(const p of knots)assert.ok(path.some(s=>gap(s,p)<.00001),'all canonical trail waypoints are preserved');
  for(let j=1;j<path.length;j++){
   const step=gap(path[j-1],path[j]);
   assert.ok(step>.01&&step<5,'trails are actually smoothed without long ruler-straight jumps');
  }
  for(let j=2;j<path.length;j++){
   const a=[path[j-1][0]-path[j-2][0],path[j-1][1]-path[j-2][1]];
   const b=[path[j][0]-path[j-1][0],path[j][1]-path[j-1][1]];
   const turn=Math.acos(Math.max(-1,Math.min(1,(a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b)))))*180/Math.PI;
   assert.ok(turn<65,'no jarring hairpins: route '+i+' vertex '+j+' angle '+turn);
  }
 }
 assert.deepEqual(ADVENTURE_PATHS.slice(0,-1),OUTDOOR_TRAILS);
 assert.deepEqual(ADVENTURE_PATHS.at(-1),[[0,212],[0,324]],'dungeon corridors not changed');
});
test('forest trails do not bury decorative trees in their centerlines',()=>{
 for(const tree of ADVENTURE_TREES)for(const path of OUTDOOR_TRAILS)
  for(let i=1;i<path.length;i++)assert.ok(segmentDistance([tree.x,tree.z],path[i-1],path[i])>=3.99);
});
test('gate, story, resource and Hollow areas have continuous accessible routes',()=>{
 const near=(p,range=6)=>OUTDOOR_TRAILS.some(path=>path.some(q=>gap(q,p)<=range));
 for(const t of [[0,86],[-24,91],[-31,95],[-20,103],[-8,108],[19,117],[-28,135],[-12,142],[23,150],[28,159],[16,163],[0,181]])assert.ok(near(t),t+' connected to a walking track');
 const quad=organicRoadPolygons(OUTDOOR_TRAILS,3.55);
 assert.ok(quad.length>=OUTDOOR_TRAILS.length*3);
 assert.ok(quad.flat(2).every(Number.isFinite));
 assert.equal(OUTDOOR_TRAILS.some(x=>x[0][1]>=195),false);
});
