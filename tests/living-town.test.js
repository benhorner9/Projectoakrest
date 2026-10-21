import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OAKREST_BUILDINGS,OAKREST_PATHS,buildOakrestTown} from '../src/town-world.js';
import {createOakrestTownLife} from '../src/town-life.js';
import {blocked,moveOnGround,clearWorldObstacles,terrainHeight} from '../src/terrain.js';
import {townInteraction,OAKREST_SERVICES} from '../src/town-services.js';

test('Oakrest has varied building orientation and continuous pedestrian streets',()=>{
  assert.ok(OAKREST_BUILDINGS.length>=11);
  assert.ok(new Set(OAKREST_BUILDINGS.map(b=>b.face)).size>=3,'town should not be one straight line of identical facades');
  assert.ok(OAKREST_PATHS.some(p=>p.some(([x])=>x< -15)));
  assert.ok(OAKREST_PATHS.some(p=>p.some(([x])=>x>15)));
  assert.deepEqual(OAKREST_SERVICES.map(s=>s.attendant),['Mara the Banker','Darrin the Shopkeeper','Alden the Forester']);
});

test('every house opens into a navigable interior through a physical doorway',()=>{
  clearWorldObstacles();
  const town=buildOakrestTown(new THREE.Scene());
  try{
    for(const b of OAKREST_BUILDINGS){
      const angle={north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2}[b.face];
      const forwardX=Math.sin(angle),forwardZ=Math.cos(angle);
      const outside={x:b.x+forwardX*(b.d/2+1.5),z:b.z+forwardZ*(b.d/2+1.5)};
      assert.equal(blocked(b.x,b.z,.34),false,b.id+' must not be a sealed solid block');
      assert.equal(blocked(b.x+forwardX*b.d/2,b.z+forwardZ*b.d/2,.34),false,b.id+' must have a clear doorway');
      assert.equal(blocked(b.x+forwardX*(b.d/2)-Math.cos(angle)*(b.w/2-.8),
        b.z+forwardZ*(b.d/2)+Math.sin(angle)*(b.w/2-.8),.34),true,b.id+' facade must remain solid beside door');
      assert.equal(town.inside(b.x,b.z),b.id);
      // Walk into the front half and do not teleport, clip or phase through walls.
      const player={...outside,y:terrainHeight(outside.x,outside.z)};
      const step=moveOnGround(player,-forwardX*3,-forwardZ*3,.34);
      assert.ok(Number.isFinite(step.y),b.id+' must have valid interior terrain');
      assert.ok(Math.hypot(step.x-outside.x,step.z-outside.z)>2.5,b.id+' must be physically enterable');
    }
    assert.equal(blocked(0,-12,.34),false,'gate must stay open');
    assert.equal(blocked(0,39,.34),true,'town well must still be solid');
  }finally{clearWorldObstacles();}
});

test('bank, shop and specialist require approaching their attendants inside',()=>{
  clearWorldObstacles();
  buildOakrestTown(new THREE.Scene());
  try{
    for(const s of OAKREST_SERVICES){
      assert.equal(townInteraction(s.x,s.z)?.id,s.id,'service works inside');
      assert.equal(townInteraction(s.npcX,s.npcZ)?.id,s.id,'attendant position works');
    }
    assert.equal(townInteraction(-30,19),null,'bank may not open from outside its side wall');
    assert.equal(townInteraction(30,19),null,'store may not open from outside its side wall');
  }finally{clearWorldObstacles();}
});

test('staff stand at counters and villagers traverse town routes without vanishing',()=>{
  clearWorldObstacles();
  const scene=new THREE.Scene();buildOakrestTown(scene);
  const life=createOakrestTownLife(scene);
  try{
    assert.equal(life.staff,3);
    assert.ok(life.count>=6);
    const initial=life.snapshot();
    for(let i=0;i<170;i++)life.update(.1,i*.1,{x:0,z:-6},true);
    const after=life.snapshot();
    assert.deepEqual(after.map(n=>n.name),initial.map(n=>n.name));
    assert.ok(after.filter((v,i)=>Math.hypot(v.x-initial[i].x,v.z-initial[i].z)>1).length>=3,
      'several citizens should visibly walk around the village');
    assert.ok(after.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.z)&&!blocked(n.x,n.z,.2)),
      'citizens should not move inside solid walls');
    const target=after[0];assert.equal(life.nearby(target.x,target.z)?.type,'citizen');
  }finally{clearWorldObstacles();}
});
