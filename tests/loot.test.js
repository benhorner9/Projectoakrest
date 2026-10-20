import test from 'node:test';
import assert from 'node:assert/strict';
import {createMonsterDrops,closestDrop,collectDrop,lootName,isValidDrop} from '../src/loot.js';
import {defaultSave,validSave,xpToLevel,LOADOUTS} from '../src/rules.js';
import {readFileSync} from 'node:fs';
test('monster drops are visible pickups, not direct currency grants',()=>{
 let n=0;const drops=createMonsterDrops('mossling',0,-10,()=>0,()=>String(++n));
 assert.equal(drops[0].kind,'coins');assert.ok(drops.some(d=>d.kind==='material'));
 assert.ok(drops.some(d=>d.kind==='weapon'));assert.ok(drops.every(isValidDrop));
 const fresh=defaultSave();assert.equal(fresh.coins,0);
 assert.equal(fresh.inventory.materials['moss-fibre'],undefined);
});
test('pickup is based on distance and does not collect remotely',()=>{
 const drops=[{id:'a',x:3,z:0,kind:'coins',itemId:'coins',amount:5}];
 assert.equal(closestDrop(drops,0,0,3.3)?.id,'a');
 assert.equal(closestDrop(drops,-3,0,3.3),null);
});
test('coin and material inventory updates only when explicitly collecting',()=>{
 const d=defaultSave();
 const coins={id:'c',kind:'coins',itemId:'coins',amount:13,x:0,z:0};
 const fibre={id:'f',kind:'material',itemId:'moss-fibre',amount:1,x:0,z:0};
 assert.equal(collectDrop(d,coins),true);assert.equal(d.coins,13);
 assert.equal(collectDrop(d,fibre),true);assert.equal(d.inventory.materials['moss-fibre'],1);
 assert.equal(lootName(fibre),'Moss Fibre');
});
test('rare weapon can be owned before level gate, duplicate salvage is controlled',()=>{
 const d=defaultSave();const weapon={id:'w',kind:'weapon',style:'ranged',itemId:'crossbow',amount:1,x:0,z:0};
 assert.ok(collectDrop(d,weapon));assert.ok(d.inventory.weapons.ranged.includes('crossbow'));
 assert.equal(d.gear.ranged,'bow');
 assert.ok(collectDrop(d,weapon));assert.equal(d.coins,8);
});
test('save survives refresh, discards malicious item kinds and preserves legacy equipment',()=>{
 const d=defaultSave();d.groundLoot=[{id:'persist',kind:'coins',itemId:'coins',amount:7,x:0,z:-10}];
 const clean=validSave(d);assert.equal(clean.groundLoot.length,1);assert.equal(clean.groundLoot[0].id,'persist');
 d.groundLoot.push({id:'invalid',kind:'weapon',itemId:'nonsense',style:'melee',amount:1,x:0,z:0});
 assert.equal(validSave(d).groundLoot.length,1);
 const n=7;const xp=Array.from({length:n-1},(_,i)=>xpToLevel(i+1)).reduce((a,b)=>a+b,0);
 const old=validSave({xp:{melee:xp},gear:{melee:'greatsword'}});
 assert.equal(old.gear.melee,'greatsword');
});
test('pickup UI remains touch actionable and XP is still awarded on kill',()=>{
 const h=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const s=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(h.includes('id="loot-pickup"')&&h.includes('id="loot-prompt"'));
 assert.ok(s.includes("lootButton.addEventListener('click'"));
 assert.ok(s.includes('spawnMonsterLoot(e);gainXp(e.type,source.style);'));
 assert.ok(!s.includes("data.coins+=type==="));
 assert.ok(s.includes('data.groundLoot=data.groundLoot.filter('));
});

test('expanded wilderness drops remain at the defeated enemy and survive reload',()=>{
 let next=0;
 for(const [type,x,z] of [['boar',11,-83],['bandit',-6,-98]]){
  const drops=createMonsterDrops(type,x,z,()=>0,()=>String(++next));
  assert.ok(drops.length>0);assert.ok(drops.every(d=>Math.hypot(d.x-x,d.z-z)<=.86));
  assert.ok(drops.every(isValidDrop));
  const d=defaultSave();d.groundLoot=drops;assert.deepEqual(validSave(JSON.parse(JSON.stringify(d))).groundLoot,drops);
  assert.ok(closestDrop(drops,x,z));
 }
 assert.equal(isValidDrop({id:'outside',kind:'coins',itemId:'coins',amount:1,x:121,z:0}),false);
});
