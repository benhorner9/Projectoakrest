import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OAKREST_BUILDINGS,buildOakrestTown} from '../src/town-world.js';
import {FACING} from '../src/town-layout.js';
import {clearWorldObstacles,blocked,moveOnGround,terrainHeight} from '../src/terrain.js';

const roofHeight=b=>b.kind==='trade'?6.55:b.kind==='bank'?6.05:
  ['store','forester','hall'].includes(b.kind)?5.15:4.15;
function hitLocal(meshes,root,x,y,z,direction,length=4){
 const from=root.localToWorld(new THREE.Vector3(x,y,z));
 const rayDirection=direction.clone().transformDirection(root.matrixWorld);
 const ray=new THREE.Raycaster(from,rayDirection,0,length);
 return ray.intersectObjects(meshes,false).length>0;
}
function world(b,x,z){
 const a=FACING[b.face];
 return {x:b.x+x*Math.cos(a)+z*Math.sin(a),z:b.z-x*Math.sin(a)+z*Math.cos(a)};
}
test('all 16 buildings have continuous real masonry from doorway lintel to roof, no upper-front holes',()=>{
 clearWorldObstacles();const scene=new THREE.Scene(),town=buildOakrestTown(scene);
 try{
  assert.equal(OAKREST_BUILDINGS.length,16,'audit must include the complete starter town');
  scene.updateMatrixWorld(true);
  for(const b of OAKREST_BUILDINGS){
   const roof=scene.getObjectByName(b.id+' removable roof');
   assert.ok(roof,b.id+' missing roof');
   const root=roof.parent,h=roofHeight(b);
   const header=scene.getObjectByName(b.id+' completed doorway header');
   assert.ok(header,b.id+' missing actual structural header above door');
   assert.equal(header.userData.cutawaySide,'front',b.id+' header must share facade cutaway');
   assert.equal(header.material,root.children.find(x=>x.name===b.id+' rear structural wall').material,
     b.id+' header must use actual external wall material');
   const bottom=header.position.y-header.scale.y/2,top=header.position.y+header.scale.y/2;
   assert.ok(bottom>=3.12&&bottom<=3.18,b.id+' doorway clearance '+bottom+' must stay walkable');
   assert.ok(top>=h,b.id+' masonry does not meet the eaves: '+top+' < '+h);
   const structuralFront=root.children.filter(x=>x.isMesh&&x.userData.cutawaySide==='front'&&x.material===header.material);
   for(const y of [3.25,3.38,(3.2+h)/2,h-.11]){
    assert.ok(hitLocal(structuralFront,root,0,y,b.d/2+1,new THREE.Vector3(0,0,-1)),
      b.id+' missing front masonry at central x=0,y='+y);
   }
   // The entry must remain an actual open aperture at standing height; upper
   // wall geometry must not be hidden inside a solid door-blocking mesh.
   for(const y of [1.0,2.4,3.08]){
    assert.equal(hitLocal(structuralFront,root,0,y,b.d/2+1,new THREE.Vector3(0,0,-1)),
      false,b.id+' structural masonry blocks the entrance at '+y);
   }
   for(const side of [-1,1]){
    const x=side*(b.w/2-.12);
    for(const y of [1.0,h-.15]){
     assert.ok(hitLocal(structuralFront,root,x,y,b.d/2+1,new THREE.Vector3(0,0,-1)),
       b.id+' front corner missing at x='+x+',y='+y);
    }
   }
   const back=root.children.find(x=>x.name===b.id+' rear structural wall');
   assert.ok(back,b.id+' rear shell missing');
   const sides=root.children.filter(x=>x.userData.cutawaySide==='left'||x.userData.cutawaySide==='right');
   assert.ok(sides.length>=2,b.id+' side wall absent');
   const shellSides=sides.filter(x=>x.material===back.material);
   for(const side of [-1,1])for(const y of [.85,h-.15]){
    assert.ok(hitLocal(shellSides,root,side*(b.w/2+1),y,0,new THREE.Vector3(-side,0,0)),
      b.id+' side missing near roof/foundation');
   }
   assert.ok(hitLocal([back],root,0,h-.15,-b.d/2-1,new THREE.Vector3(0,0,1)),
     b.id+' rear upper wall missing');
   // Both triangular end caps remain part of the actual removable roof. A
   // horizontal ray from the road hits real roof masonry, not an empty gable.
   const ends=roof.children.filter(m=>m.geometry?.type==='ShapeGeometry');
   assert.equal(ends.length,2,b.id+' should have front and rear gable enclosures');
   for(const side of [-1,1])for(const x of [0,b.w*.20]){
    const z=side*(b.d/2+2),dir=new THREE.Vector3(0,0,-side);
    assert.ok(hitLocal(ends,root,x,h+.55,z,dir),
      b.id+' roof gable open on '+(side===1?'front':'back')+' at x='+x);
   }
   const doorway=world(b,0,b.d/2);
   assert.equal(blocked(doorway.x,doorway.z,.30),false,b.id+' gameplay door collision must remain clear');
   const start=world(b,0,b.d/2+1.35),end=world(b,0,b.d/2-1.35);
   const walk=moveOnGround({x:start.x,z:start.z,y:terrainHeight(start.x,start.z)},
    end.x-start.x,end.z-start.z,.3);
   assert.ok(Math.hypot(walk.x-end.x,walk.z-end.z)<.55,b.id+' cannot walk through the finished door');
   town.update({x:b.x,z:b.z});assert.equal(roof.visible,false,b.id+' inside roof cutaway broken');
   assert.equal(header.visible,false,b.id+' doorway header not hidden with facade during cutaway');
   town.update({x:0,z:-28});assert.equal(roof.visible,true,b.id+' exterior roof missing');
   assert.equal(header.visible,true,b.id+' exterior header not restored');
  }
 }finally{clearWorldObstacles();}
});
