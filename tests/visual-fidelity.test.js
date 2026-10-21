import test from 'node:test';
import assert from 'node:assert/strict';
import {SURFACE_PRESETS,GRAPHICS_QUALITY,graphicsProfile,paintSurface,createSurfaceMaterial,createOakrestLighting} from '../src/visual-fidelity.js';

test('quality profiles are bounded and fall back safely',()=>{
  assert.deepEqual(Object.keys(GRAPHICS_QUALITY),['low','balanced','high']);
  assert.equal(graphicsProfile('bogus'),GRAPHICS_QUALITY.balanced);
  assert.ok(graphicsProfile('low').pixelRatio<graphicsProfile('high').pixelRatio);
  assert.ok(graphicsProfile('low').shadowSize<graphicsProfile('high').shadowSize);
  assert.equal(graphicsProfile('low').practicalLights,0);
});

test('every architectural surface draws deterministic nonempty marks',()=>{
  for(const kind of Object.keys(SURFACE_PRESETS)){
    const operations=[];
    const ctx={
      fillRect(...a){operations.push(['fill',...a]);},
      beginPath(){operations.push(['begin']);},
      moveTo(...a){operations.push(['move',...a]);},
      lineTo(...a){operations.push(['line',...a]);},
      stroke(){operations.push(['stroke']);},
      set fillStyle(value){assert.equal(typeof value,'string');},
      set strokeStyle(value){assert.equal(typeof value,'string');},
      set lineWidth(value){assert.ok(value>0);}
    };
    paintSurface(ctx,kind);const snapshot=JSON.stringify(operations);
    assert.ok(operations.length>20,kind+' must have genuine surface detail');
    operations.length=0;paintSurface(ctx,kind);
    assert.equal(JSON.stringify(operations),snapshot,kind+' must be deterministic');
  }
});

test('PBR material profiles retain material identity and reject unknown surfaces',()=>{
  class Material{constructor(args){Object.assign(this,args);}}
  const THREE={MeshStandardMaterial:Material};
  const mat=createSurfaceMaterial(THREE,'#b9a88c','limestone',{side:2});
  assert.equal(mat.color,'#b9a88c');
  assert.equal(mat.side,2);
  assert.ok(mat.roughness>.8);
  assert.equal(mat.map,undefined); // Node/CI has no browser canvas.
  assert.throws(()=>createSurfaceMaterial(THREE,'white','unmapped'),/Unknown Oakrest/);
});

function position(){
  return {x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;this.updated=true;}};
}
function fakeRig(){
  const lightFactory=class{constructor(colour,intensity,distance,decay){
    this.color=colour;this.intensity=intensity;this.distance=distance;this.decay=decay;
    this.position=position();this.visible=true;
  }};
  const scene={items:[],add(x){this.items.push(x);}};
  const camera={left:0,right:0,top:0,bottom:0,updated:false,updateProjectionMatrix(){this.updated=true;}};
  const mapSize={x:1024,y:1024,set(x,y){this.x=x;this.y=y;}};
  const shadow={camera,mapSize,bias:0,normalBias:0,needsUpdate:false,dispose(){}};
  const sun={target:{position:position(),updateMatrixWorld(){}},position:position(),shadow};
  return {scene,sun,THREE:{PointLight:lightFactory}};
}

test('sun follow, interior lighting and lamp budgets keep rendering bounded',()=>{
  const {scene,sun,THREE}=fakeRig();
  const lights=createOakrestLighting({THREE,scene,sun,quality:'balanced',terrainHeight:()=>1});
  assert.equal(scene.items.length,4); // 2 pooled street lights, 1 interior, 1 target.
  assert.ok(sun.shadow.camera.updated);
  const player={x:-22,z:9};
  lights.update(player,null,true);
  assert.equal(lights.metrics().practicalLights,1);
  assert.equal(lights.metrics().interiorLight,false);
  assert.equal(sun.target.position.x,-24);
  lights.update({x:38,z:78},null,true);
  assert.equal(sun.target.position.x,40);
  assert.ok(lights.metrics().practicalLights<=1);
  lights.update(player,{id:'bank',x:-30,z:14},true);
  assert.equal(lights.metrics().interiorLight,true);
  assert.equal(lights.metrics().practicalLights,0);
  lights.setQuality('high');
  assert.equal(lights.metrics().shadowResolution,2048);
  lights.update(player,null,true);
  assert.ok(lights.metrics().practicalLights<=2);
  lights.setQuality('low');
  lights.update(player,null,true);
  assert.equal(lights.metrics().practicalLights,0);
  lights.update(player,null,false);
  assert.equal(lights.metrics().interiorLight,false);
  assert.equal(lights.metrics().practicalLights,0);
});
