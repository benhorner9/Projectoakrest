import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentSphere,movingSphereHit,segmentBox,segmentCylinder,sweptStrikeHit,MELEE_PROFILES,groundPath,abilityCooldownKey,dodgeInvulnerable,DODGE,withinChargeLane} from '../src/combat-physics.js';
import {segmentWorldHit,addWorldObstacle,clearWorldObstacles,groundSegmentClear,moveOnGround,terrainHeight,blocked,setCollisionArea} from '../src/terrain.js';
test.afterEach(()=>clearWorldObstacles());
const v=(x,z,y=1)=>({x,y,z});
test('projectile first contact occurs before the target centre and orders cover correctly',()=>{
 const hit=segmentSphere(v(0,0),v(0,-10),v(0,-5),1);
 assert.equal(hit,.4);
 assert.equal(segmentSphere(v(0,0),v(0,-10),v(2,-5),1),null);
 assert.equal(segmentSphere(v(0,0),v(0,0),v(0,0),1),0);
});
test('fast projectiles and moving targets collide in relative space',()=>{
 assert.notEqual(movingSphereHit(v(-5,0),v(5,0),v(0,-5),v(0,5),.5),null);
 assert.equal(movingSphereHit(v(-5,0),v(5,0),v(0,8),v(0,9),.5),null);
});
test('analytic boxes and cylinders stop thin cover at high speed',()=>{
 assert.ok(Math.abs(segmentBox(v(-100,0),v(100,0),{x:-.01,y:0,z:-1},{x:.01,y:2,z:1})-.49995)<1e-10);
 assert.ok(Math.abs(segmentCylinder(v(-100,0),v(100,0),v(0,0),.01,0,2)-.49995)<1e-8);
 assert.equal(segmentCylinder(v(-1,0,8),v(1,0,8),v(0,0),.2,0,2),null);
});
test('world geometry blocks arrows at exact first contact, including thin fences',()=>{
 addWorldObstacle({x:0,z:0,hx:3,hz:.01,height:3});
 const h=segmentWorldHit(v(0,10),v(0,-10),.02);
 assert.ok(h>.49&&h<.5);
 assert.equal(segmentWorldHit(v(0,10,6),v(0,-10,6),.02),null);
});
test('forward melee excludes rear targets, misses and cover',()=>{
 const strike={origin:v(0,0),yaw:0,reach:3,profile:MELEE_PROFILES.sword};
 const hit=c=>sweptStrikeHit(strike,0,1,c,c,.35,segmentWorldHit);
 assert.notEqual(hit(v(0,-2)),null);
 assert.equal(hit(v(0,1)),null);
 assert.equal(hit(v(0,-4)),null);
 addWorldObstacle({x:0,z:-1,hx:2,hz:.1,height:3});
 assert.equal(hit(v(0,-2)),null);
});
test('swept contact remains reachable at 30, 60 and 144 Hz',()=>{
 for(const fps of [30,60,144]){
  const strike={origin:v(0,0),yaw:0,reach:3,profile:MELEE_PROFILES.sword};
  let hit=false;
  for(let i=0;i<Math.ceil(fps*.14);i++){
   const from=Math.min(1,i/fps/.14),to=Math.min(1,(i+1)/fps/.14);
   const c=v(.4,-2);
   hit ||= sweptStrikeHit(strike,from,to,c,c,.35)!==null;
  }assert.equal(hit,true,String(fps));
 }
});
test('a moving enemy crosses the active weapon volume',()=>{
 const s={origin:v(0,0),yaw:0,reach:3,profile:MELEE_PROFILES.greatsword};
 assert.notEqual(sweptStrikeHit(s,0,1,v(-1,-2),v(1,-2),.4),null);
});
test('root-safe navigation goes around cover and does not cut corners',()=>{
 addWorldObstacle({x:0,z:0,hx:1,hz:2,height:3});
 const from={x:-3,z:0},goal={x:3,z:0};
 const path=groundPath(from,goal,(a,b)=>groundSegmentClear(a,b,.42));
 assert.ok(path.length>1);
 let last=from;for(const point of path){assert.equal(groundSegmentClear(last,point,.42),true);last=point;}
 assert.deepEqual(last,goal);
});
test('unreachable navigation is bounded and returns no illegal shortcut',()=>{
 addWorldObstacle({x:0,z:0,r:3,height:3});
 const path=groundPath({x:5,z:0},{x:0,z:0},(a,b)=>groundSegmentClear(a,b),{maxNodes:40});
 assert.deepEqual(path,[]);
});
test('dodge travel cannot cross walls and stays grounded at multiple rates',()=>{
 addWorldObstacle({x:0,z:0,hx:3,hz:.1,height:3});
 for(const fps of [30,60,144]){
  let p={x:0,z:2};
  for(let i=0;i<fps;i++)p=moveOnGround(p,0,-8/fps);
  assert.equal(blocked(p.x,p.z,.42),false);assert.ok(p.z>.5);assert.equal(p.y,terrainHeight(p.x,p.z));
 }
});
test('shared ability recovery cannot be reset by changing weapon family',()=>{
 assert.equal(abilityCooldownKey('melee','sword',{id:'s0'}),abilityCooldownKey('melee','daggers',{id:'s0'}));
 assert.notEqual(abilityCooldownKey('melee','sword',{id:'w0'}),abilityCooldownKey('melee','daggers',{id:'w0'}));
});
test('invulnerability is limited to the active dodge window',()=>{
 assert.equal(dodgeInvulnerable(10,10),false);
 assert.equal(dodgeInvulnerable(10+DODGE.startup+.001,10),true);
 assert.equal(dodgeInvulnerable(10+DODGE.startup+DODGE.active+.001,10),false);
 assert.equal(dodgeInvulnerable(11,10),false);
});

test('hidden world scenery never blocks tutorial or portal courtyard',()=>{
 clearWorldObstacles();
 assert.equal(blocked(6,19,.42),false,'former well should no longer have ghost collision');
 addWorldObstacle({x:18,z:36,r:1.7,height:4.8});
 assert.equal(blocked(18,36,.42),true);
 setCollisionArea('tutorial');assert.equal(blocked(18,36,.42),false);
 addWorldObstacle({x:20,z:0,r:1,height:3,area:'tutorial'});assert.equal(blocked(20,0),true);
 setCollisionArea('world');assert.equal(blocked(20,0),false);
 clearWorldObstacles();
});

test('boar body contact cannot damage beyond or behind its advertised charge lane',()=>{
 const warning={x:0,z:0,direction:{x:0,z:-1},length:6,width:1.2};
 assert.equal(withinChargeLane(warning,{x:0,z:-6}),true);
 assert.equal(withinChargeLane(warning,{x:0,z:-6.01}),false);
 assert.equal(withinChargeLane(warning,{x:0,z:.01}),false);
 assert.equal(withinChargeLane(warning,{x:1.21,z:-3}),false);
 assert.equal(withinChargeLane(warning,{x:1,z:-3}),true);
});
