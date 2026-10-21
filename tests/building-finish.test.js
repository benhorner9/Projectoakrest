import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OAKREST_BUILDINGS,buildOakrestTown} from '../src/town-world.js';
import {reservedTownGround,localBuildingPosition,buildingAt} from '../src/town-layout.js';
import {terrainHeight,clearWorldObstacles,blocked,moveOnGround} from '../src/terrain.js';
import {createOakrestScenery} from '../src/visual-world.js';

const angle={north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2};

test('every building sits on an exactly level base with smoothly restored exterior terrain',()=>{
  for(const b of OAKREST_BUILDINGS){
    const middle=terrainHeight(b.x,b.z),rad=angle[b.face],s=Math.sin(rad),c=Math.cos(rad);
    for(const [xx,zz] of [[0,0],[b.w*.36,b.d*.25],[-b.w*.35,-b.d*.30],[-b.w*.39,b.d*.38]]){
      const x=b.x+xx*c+zz*s,z=b.z-xx*s+zz*c;
      assert.ok(Math.abs(terrainHeight(x,z)-middle)<1e-6,b.id+' base rises through its interior');
      assert.equal(buildingAt(x,z)?.id,b.id);
      const p=localBuildingPosition(b,x,z);
      assert.ok(Math.abs(p.x-xx)<1e-6&&Math.abs(p.z-zz)<1e-6);
    }
    const f={x:Math.sin(rad),z:Math.cos(rad)};
    const h1=terrainHeight(b.x+f.x*(b.d/2+2.4),b.z+f.z*(b.d/2+2.4));
    assert.ok(Number.isFinite(h1),b.id+' terrain must transition gently outside');
  }
});

test('gabled roofs meet at their ridge and every facade remains collision-open at its doorway',()=>{
  clearWorldObstacles();const scene=new THREE.Scene(),town=buildOakrestTown(scene);
  try{
    scene.updateMatrixWorld(true);
    for(const b of OAKREST_BUILDINGS){
      const roof=scene.getObjectByName(b.id+' removable roof');
      assert.ok(roof,b.id+' missing roof');
      const panels=roof.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry').slice(0,3);
      // First and third roof boxes are the two slopes, other boxes are trim.
      const slopes=roof.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry'&&Math.abs(o.rotation.z)>.1&&o.scale.x>2);
      assert.equal(slopes.length,2,b.id+' should have exactly two joined slopes');
      const ridge=slopes.map(p=>{
        const side=Math.sign(p.position.x);
        return new THREE.Vector3(side>0?-.5:.5,0,0).applyMatrix4(p.matrixWorld);
      });
      assert.ok(ridge[0].distanceTo(ridge[1])<.16,b.id+' roof slopes do not meet');
      const gables=roof.children.filter(o=>o.geometry?.type==='ShapeGeometry');
      assert.equal(gables.length,2,b.id+' has open roof ends');
      const f={x:Math.sin(angle[b.face]),z:Math.cos(angle[b.face])};
      assert.equal(blocked(b.x+f.x*b.d*.5,b.z+f.z*b.d*.5,.32),false,b.id+' door obstructed');
      const at={x:b.x+f.x*(b.d/2+1.35),z:b.z+f.z*(b.d/2+1.35)};
      const walk=moveOnGround({...at,y:terrainHeight(at.x,at.z)},-2.75*f.x,-2.75*f.z,.32);
      assert.ok(Math.hypot(walk.x-at.x,walk.z-at.z)>2.25,b.id+' threshold obstructed');
      town.update({x:b.x,z:b.z});
      assert.equal(roof.visible,false,b.id+' roof must hide indoors');
      town.update({x:0,z:-28});
      assert.equal(roof.visible,true,b.id+' roof must show outdoors');
    }
  }finally{clearWorldObstacles();}
});

test('instanced natural grass, pebbles and wildflowers never occupy a building or city path',()=>{
  clearWorldObstacles();
  const scene=new THREE.Scene();let seed=71419;
  const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
  const MAT={water:new THREE.MeshBasicMaterial({color:'#759e9b'})};
  try{
    createOakrestScenery({THREE,scene,random,MAT});
    const arrays=scene.children.filter(o=>o.isInstancedMesh);
    assert.ok(arrays.length>=3,'expected grass, pebbles and flower instances');
    const matrix=new THREE.Matrix4(),at=new THREE.Vector3();
    let total=0;
    for(const collection of arrays)for(let i=0;i<collection.count;i++){
      collection.getMatrixAt(i,matrix);at.setFromMatrixPosition(matrix);
      assert.equal(reservedTownGround(at.x,at.z),false,
        'wild plant/pebble in building or pavement '+at.x+','+at.z);
      total++;
    }
    assert.ok(total>=1325,'natural outdoor detail should be retained away from buildings');
    for(const b of OAKREST_BUILDINGS)assert.equal(reservedTownGround(b.x,b.z),true);
  }finally{clearWorldObstacles();}
});
