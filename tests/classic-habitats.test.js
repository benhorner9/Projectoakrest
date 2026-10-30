import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave} from '../src/rules.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {CLASSIC_OVERWORLD_SPAWNS} from '../src/classic-world-spawns.js';
import {ADVENTURE_SPAWNS,ADVENTURE_TARGETS} from '../src/adventure-content.js';
import {solidAt,clearClassicLine,findClassicPath} from '../src/classic-presentation.js';
import {insideHabitat,classicMonsterRadius} from '../src/classic-habitats.js';

test('every shipped encounter starts clear of walls/trees and within its habitat',()=>{
 for(const m of [...CLASSIC_OVERWORLD_SPAWNS,...ADVENTURE_SPAWNS]){
  assert.equal(solidAt(m.x,m.z,classicMonsterRadius(m)),false,m.id);
  assert.ok(insideHabitat(m,m.habitat,classicMonsterRadius(m)),m.id);
  if(m.type!=='dummy'&&m.room===undefined)assert.ok(m.habitat,m.id);
 }
 // Keep the instructor beside the safe training dummy and civilians outside monster territories.
 for(const npc of ADVENTURE_TARGETS.filter(t=>t.kind==='adventure-npc'))
  for(const m of CLASSIC_OVERWORLD_SPAWNS.filter(m=>m.habitat))assert.equal(insideHabitat(npc,m.habitat),false,npc.id);
});
test('blocked authored spawn is repaired and all monster movement respects body clearance',()=>{
 const g=createClassicCombat({save:defaultSave(),monsterDefinitions:[{id:'test',type:'boar',x:10,z:86,maxHp:100}]});
 let prev=g.getState().monsters[0];assert.equal(solidAt(prev.x,prev.z,.85),false);
 for(let n=0;n<240;n++){
  g.tick(.05,{x:14,z:92});const next=g.getState().monsters[0];
  assert.equal(solidAt(next.x,next.z,.85),false);
  assert.ok(clearClassicLine(prev,next,.85),'no wall tunnelling');prev=next;
 }
});
test('hostile habitats cannot pursue a player into town; safe return remains bounded',()=>{
 for(const def of CLASSIC_OVERWORLD_SPAWNS.filter(m=>m.habitat)){
  const g=createClassicCombat({save:defaultSave(),monsterDefinitions:[def],random:()=>.9});
  const radius=classicMonsterRadius(def);
  for(let i=0;i<20;i++)g.tick(.1,{x:def.x,z:def.z+1});
  for(let i=0;i<160;i++){
   g.tick(.1,{x:0,z:39});const e=g.getState().monsters[0];
   assert.ok(insideHabitat(e,e.habitat,radius));assert.equal(solidAt(e.x,e.z,radius),false);
  }
  const e=g.getState().monsters[0];assert.equal(e.aggro,false);assert.equal(e.retreating,false);
  assert.ok(Math.hypot(e.x-e.startX,e.z-e.startZ)<.3);
 }
});
test('wide monster paths route around the village wall through a real gate',()=>{
 const start={x:12,z:91},end={x:0,z:80},radius=.85;
 const path=findClassicPath(start,end,{radius});assert.ok(path.length>0);
 let prev=start;for(const p of path){assert.ok(clearClassicLine(prev,p,radius));prev=p;}
});
