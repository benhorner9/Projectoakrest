import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSIC_ROADS,CLASSIC_PLAZAS} from '../src/classic-town-plan.js';
import {TOWN_TRAIL_WIDTH,CLASSIC_TERRAIN_BOUNDS,paintTownGrass,paintTownTrails,townTerrainPointToTexture} from '../src/classic-terrain-paint.js';

function capture(){
 const calls={fillRect:[],lineTo:[],curve:0,stroke:0,gradient:0};
 const ctx={canvas:{width:1024,height:1152},
  save(){},restore(){},beginPath(){},moveTo(){},lineTo(x,y){calls.lineTo.push([x,y]);},
  quadraticCurveTo(){calls.curve++;},closePath(){},
  stroke(){calls.stroke++;},fill(){},
  fillRect(...args){calls.fillRect.push(args);},
  createRadialGradient(){calls.gradient++;return {addColorStop(){}};}
 };
 return {calls,ctx};
}
test('shared village painter creates flowing roads and naturally worn commons, never square slabs',()=>{
 const {ctx,calls}=capture();
 const toPixel=point=>townTerrainPointToTexture(point,1024,1152);
 paintTownTrails(ctx,toPixel,1024/115,{detail:false});
 assert.equal(calls.fillRect.length,0,'plazas must not be rendered as rectangular blocks');
 assert.ok(calls.stroke>=CLASSIC_ROADS.length*3,'each navigation path gets a blended verge');
 assert.ok(calls.curve>15,'roads have rounded transitions rather than quadrilateral tile joins');
 assert.equal(calls.gradient,CLASSIC_PLAZAS.length,'each commons has a gradual organic fade');
 assert.ok(TOWN_TRAIL_WIDTH>=3&&TOWN_TRAIL_WIDTH<=5);
});
test('terrain world-to-texture mapping spans exactly the walkable village rectangle',()=>{
 const b=CLASSIC_TERRAIN_BOUNDS;
 assert.deepEqual(townTerrainPointToTexture({x:b.minX,z:b.minZ},1024,1152),{x:0,y:0});
 assert.deepEqual(townTerrainPointToTexture({x:b.maxX,z:b.maxZ},1024,1152),{x:1024,y:1152});
 const p=townTerrainPointToTexture({x:0,z:34},1024,1152);
 assert.ok(Math.abs(p.x-512)<1&&Math.abs(p.y-576)<1,'well square lies at terrain texture centre');
});
test('organic meadow detail uses stable hand-drawn marks, one background and no tiled planes',()=>{
 const {ctx,calls}=capture();
 paintTownGrass(ctx,p=>townTerrainPointToTexture(p,1024,1152),1024/115,true);
 assert.ok(calls.fillRect.length>1000,'subtle deterministic grass marks are painted on one canvas');
 const simple=capture();
 paintTownGrass(simple.ctx,p=>p,1,false);
 assert.equal(simple.calls.fillRect.length,1,'minimap avoids extraneous fine noise');
});
