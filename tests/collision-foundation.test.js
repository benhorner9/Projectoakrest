import test from 'node:test';
import * as THREE from 'three';
import {buildOakrestTown} from '../src/town-world.js';
import assert from 'node:assert/strict';
import {
 addWorldObstacle,clearWorldObstacles,blocked,moveOnGround,safeCamera,
 terrainHeight,segmentWorldHit
} from '../src/terrain.js';

test.afterEach(()=>clearWorldObstacles());

test('character body has a radius at solid houses and world bounds',()=>{
 buildOakrestTown(new THREE.Scene());
 assert.equal(blocked(-17.95,12,0),false);
 assert.equal(blocked(-17.95,12,.42),true);
 assert.equal(blocked(69.8,0,.42),false,'expanded world is navigable beyond the old edge');
 assert.equal(blocked(119.8,0,.42),true);
 assert.equal(blocked(0,11,.42),false);
});

test('fast movement and dodge cannot tunnel through house walls',()=>{
 buildOakrestTown(new THREE.Scene());
 for(const stride of [2,10,30]){
  const p=moveOnGround({x:-14,z:20},0,-stride);
  assert.equal(blocked(p.x,p.z,.42),false);
  assert.ok(p.z>=16.2, `collision at stride ${stride}, got ${p.z}`);
 }
});

test('trees are solid but are not giant canopy-sized barriers',()=>{
 assert.equal(addWorldObstacle({x:30,z:0,r:.5,height:4}),true);
 assert.equal(blocked(30,0,.42),true);
 assert.equal(blocked(31.1,0,.42),false);
 const p=moveOnGround({x:27,z:0},6,0);
 assert.ok(p.x<29.2,'hero should stop before trunk');
 assert.ok(p.x>28.5,'small trunk must not block from far away');
});

test('fences block movement but still permit following clear paths',()=>{
 addWorldObstacle({x:0,z:25,hx:4,hz:.2,height:1.4});
 const blockedAt=moveOnGround({x:0,z:28},0,-7);
 assert.ok(blockedAt.z>25.5);
 const open=moveOnGround({x:-6,z:28},0,-7);
 assert.ok(open.z<22);
});

test('environment collision rejects invalid dynamic shapes safely',()=>{
 assert.equal(addWorldObstacle({x:Infinity,z:0,r:1,height:2}),false);
 assert.equal(addWorldObstacle({x:0,z:0,r:-1,height:2}),false);
 assert.equal(blocked(NaN,0),true);
 assert.equal(blocked(0,0,-1),true);
});

test('projectiles hit buildings instead of passing through walls',()=>{
 buildOakrestTown(new THREE.Scene());
 const hit=segmentWorldHit({x:-14,y:2,z:20},{x:-14,y:2,z:5});
 assert.ok(hit!==null && hit>0 && hit<1,`wall hit: ${hit}`);
 assert.equal(segmentWorldHit({x:-14,y:18,z:20},{x:-14,y:18,z:5}),null);
 assert.equal(segmentWorldHit({x:0,y:2,z:11},{x:0,y:2,z:5}),null);
});

test('arrows and spells hit dynamically registered trunks',()=>{
 addWorldObstacle({x:30,z:-25,r:.55,height:4});
 const y=terrainHeight(30,-25)+2;
 const hit=segmentWorldHit({x:27,y,z:-25},{x:33,y,z:-25});
 assert.ok(hit!==null && hit>0 && hit<1);
 assert.equal(segmentWorldHit({x:27,y:y+10,z:-25},{x:33,y:y+10,z:-25}),null);
});

test('camera obstruction honours dynamic scenery and terrain height',()=>{
 addWorldObstacle({x:30,z:-25,r:.6,height:5});
 const y=terrainHeight(30,-25);
 const cam=safeCamera({x:27,y:y+2,z:-25},{x:34,y:y+3,z:-25});
 assert.ok(cam.x<30, `camera should stop before trunk: ${cam.x}`);
 assert.ok(cam.y>=terrainHeight(cam.x,cam.z)+.65);
});

test('ground impact is detected before projectile travels under terrain',()=>{
 const hit=segmentWorldHit({x:0,y:3,z:0},{x:0,y:-1,z:0});
 assert.ok(hit!==null&&hit>.5&&hit<1);
});
