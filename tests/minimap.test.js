import test from 'node:test';
import assert from 'node:assert/strict';
import {MINIMAP_SPAN,mapPoint,minimapArea,isNearbyMinimapPoint,drawMinimap,createOakrestMinimap} from '../src/minimap.js';

function fakeContext(){
 const calls=[];
 const ctx={calls,canvas:{width:160,height:160}};
 for(const fn of ['clearRect','save','restore','beginPath','arc','clip','fill','moveTo','lineTo','stroke','strokeRect','fillRect','translate','rotate','fillText','setTransform'])
  ctx[fn]=(...args)=>calls.push([fn,...args]);
 return ctx;
}
test('north-up live map uses actual player-centred x and z coordinates',()=>{
 const center=mapPoint(20,40,20,40,160);
 assert.deepEqual(center,{x:80,y:80});
 assert.ok(mapPoint(20,30,20,40,160).y<center.y,'negative Z must be north/up');
 assert.ok(mapPoint(30,40,20,40,160).x>center.x,'positive X must be east/right');
 assert.equal(mapPoint(20+MINIMAP_SPAN/2,40,20,40,160).x,160);
 assert.equal(isNearbyMinimapPoint(0,0,0,0),true);
 assert.equal(isNearbyMinimapPoint(300,300,0,0),false);
});
test('map area label changes accurately with location and instance',()=>{
 assert.equal(minimapArea('world',50),'OAKREST TOWN');
 assert.equal(minimapArea('world',-30),'FOREST ROAD');
 assert.equal(minimapArea('world',-60),'GREENWOOD');
 assert.equal(minimapArea('tutorial',20),'FIRST STEPS');
 assert.equal(minimapArea('realm',20),'PORTAL REALM');
});
test('paintable minimap supports world/realm/tutorial and hostile markers',()=>{
 const ctx=fakeContext();
 for(const area of ['world','tutorial','realm']){
  drawMinimap(ctx,{x:0,z:0,yaw:.7,area,enemies:[{x:3,z:3,type:'boar'},{x:4,z:4,type:'bandit',dead:true}]});
  assert.ok(ctx.calls.some(x=>x[0]==='clip'),area+' must clip its circular map');
  assert.ok(ctx.calls.some(x=>x[0]==='rotate'),area+' should rotate player arrow');
 }
 assert.ok(ctx.calls.some(x=>x[0]==='fillRect'));
});
test('canvas draws at capped device pixel ratio and throttles to 160 ms',()=>{
 const ctx=fakeContext(),label={textContent:''};
 const canvas={width:160,height:160,getContext:()=>ctx,getBoundingClientRect:()=>({width:124})};
 const map=createOakrestMinimap(canvas,label);
 map.update(0,{x:0,z:5,area:'world',yaw:0,enemies:[]});
 assert.equal(canvas.width,124);
 assert.equal(label.textContent,'OAKREST TOWN');
 const count=ctx.calls.length;
 map.update(40,{x:0,z:-70,area:'world',yaw:0,enemies:[]});
 assert.equal(ctx.calls.length,count);
 map.update(180,{x:0,z:-70,area:'world',yaw:0,enemies:[]});
 assert.equal(label.textContent,'GREENWOOD');
 assert.ok(ctx.calls.length>count);
});
