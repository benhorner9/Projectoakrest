import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,validSave,freshCharacterSave} from '../src/rules.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {createClassicSaveManager} from '../src/classic-save-manager.js';

const ID='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PROFILE={id:ID,name:'Classic Tester'};
function store({dev=true,character=defaultSave(),onWrite=null}={}){
 const prefix=dev?'oakrest-dev-':'oakrest-';
 const data=new Map(),raw=JSON.stringify(character);
 data.set(prefix+'characters-v1',JSON.stringify([PROFILE]));
 data.set(prefix+'active-character',ID);
 data.set(prefix+'character-save-'+ID,raw);
 const storage={
  getItem:k=>data.has(k)?data.get(k):null,
  setItem(k,v){if(onWrite)onWrite(k,v);data.set(k,String(v));},
  removeItem:k=>data.delete(k)
 };
 return {storage,data,raw,saveKey:prefix+'character-save-'+ID,
  backupKey:prefix+'classic-before-block6-'+ID};
}
const managerFor=(s,profile=PROFILE)=>createClassicSaveManager({
 storage:s.storage,pathname:'/oakrest-dev/classic.html',profile,baselineRaw:s.raw
});
test('saving starts off and explicitly opts in only for a selected existing character',()=>{
 const s=store(),m=managerFor(s);
 assert.equal(m.status().enabled,false);
 assert.equal(m.save(defaultSave()).ok,false);
 assert.equal(s.storage.getItem(s.backupKey),null);
 assert.equal(m.enable().ok,true);
 assert.equal(m.status().enabled,true);
 assert.equal(s.storage.getItem(s.backupKey),s.raw);
 assert.equal(s.storage.getItem(s.saveKey),s.raw,'opt in must not mutate the actual save');
});
test('existing 3D saved records retain exact schema and can be reloaded after bank/purchase',()=>{
 const s=store(),m=managerFor(s);
 assert.equal(m.enable().ok,true);
 const sim=createClassicCombat({save:validSave(JSON.parse(s.raw))});
 assert.equal(sim.itemAction({type:'bank',kind:'coins',direction:'deposit',quantity:1},{x:-30,z:14}).ok,false);
 const coins=JSON.parse(s.raw);
 coins.coins=150;
 // Exercise real shop logic on a clone with sufficient funds.
 const buyer=createClassicCombat({save:coins});
 const result=buyer.itemAction({type:'buy',id:'starter-melee-set'},{x:30,z:14});
 assert.equal(result.ok,true);
 assert.equal(m.save(buyer.persistentSave()).ok,true);
 const loaded=validSave(JSON.parse(s.storage.getItem(s.saveKey)));
 assert.equal(loaded.coins,150-result.price);
 assert.ok(loaded.inventory.slotted.length>0);
 assert.deepEqual(validSave(JSON.parse(s.storage.getItem(s.backupKey))),validSave(JSON.parse(s.raw)));
 assert.equal(m.status().writes,1);
});
test('practice loan weapons are NEVER persisted or created in the owned inventory',()=>{
 const original=defaultSave();
 for(const style of ['melee','magic','ranged']){
  original.inventory.weapons[style]=[];
  original.gear[style]='none';
 }
 const s=store({character:original}),sim=createClassicCombat({save:original});
 assert.ok(sim.sandboxSave().inventory.weapons.melee.includes('sword'));
 const exportData=sim.persistentSave();
 for(const style of ['melee','magic','ranged']){
  assert.deepEqual(exportData.inventory.weapons[style],[]);
  assert.equal(exportData.gear[style],'none');
 }
 const manager=managerFor(s);
 assert.equal(manager.enable().ok,true);
 assert.equal(manager.save(exportData).ok,true);
 const saved=validSave(JSON.parse(s.storage.getItem(s.saveKey)));
 for(const style of ['melee','magic','ranged']){
  assert.deepEqual(saved.inventory.weapons[style],[]);
  assert.equal(saved.gear[style],'none');
 }
 assert.equal(s.storage.getItem(s.backupKey),s.raw);
});
test('a concurrent edit from 3D or another tab blocks Classic writes without overwriting it',()=>{
 const s=store(),manager=managerFor(s);
 assert.equal(manager.enable().ok,true);
 const concurrent=JSON.stringify({...defaultSave(),coins:777});
 s.storage.setItem(s.saveKey,concurrent);
 const change=manager.save({...defaultSave(),coins:11});
 assert.equal(change.ok,false);
 assert.match(change.reason,/changed/i);
 assert.equal(s.storage.getItem(s.saveKey),concurrent);
 assert.equal(s.storage.getItem(s.backupKey),s.raw);
 assert.equal(manager.status().enabled,false);
 assert.equal(manager.status().blocked!==null,true);
});
test('character selection changes make all subsequent writes fail closed',()=>{
 const s=store(),m=managerFor(s);
 assert.equal(m.enable().ok,true);
 s.storage.setItem('oakrest-dev-active-character','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 assert.equal(m.save({...defaultSave(),coins:120}).ok,false);
 assert.equal(s.storage.getItem(s.saveKey),s.raw);
});
test('a missing, tutorial or corrupted character cannot enable writes',()=>{
 const s=store({character:freshCharacterSave()}),m=managerFor(s);
 assert.equal(m.enable().ok,false);
 assert.equal(s.storage.getItem(s.backupKey),null);
 const none=createClassicSaveManager({storage:s.storage,pathname:'/oakrest-dev/classic.html',profile:null,baselineRaw:null});
 assert.equal(none.enable().ok,false);
 const bad=store(),corrupt=managerFor(bad);
 bad.storage.setItem(bad.saveKey,'{broken json');
 assert.equal(corrupt.enable().ok,false);
});
test('all saved characters are isolated by dev/public namespace and character ID',()=>{
 const d=store(),p=store({dev:false});
 const m=managerFor(d);
 assert.equal(m.enable().ok,true);
 assert.equal(m.save({...defaultSave(),coins:88}).ok,true);
 assert.equal(p.storage.getItem(p.saveKey),p.raw);
 assert.equal(p.storage.getItem(p.backupKey),null);
 assert.equal(d.storage.getItem(d.backupKey),d.raw);
});
test('storage failure during backup refuses to enable persistence, original save intact',()=>{
 const s=store({onWrite:(k)=>{if(k.includes('classic-before-block6'))throw Error('quota');}});
 const m=managerFor(s);
 assert.equal(m.enable().ok,false);
 assert.equal(s.storage.getItem(s.saveKey),s.raw);
 assert.equal(m.status().enabled,false);
});
test('existing backup is never overwritten by enabling a second Classic session',()=>{
 const s=store(),m=managerFor(s);assert.equal(m.enable().ok,true);
 const backup=s.storage.getItem(s.backupKey);
 const changed=JSON.stringify({...defaultSave(),coins:5});
 assert.equal(m.save(JSON.parse(changed)).ok,true);
 const m2=createClassicSaveManager({storage:s.storage,pathname:'/oakrest-dev/classic.html',
  profile:PROFILE,baselineRaw:s.storage.getItem(s.saveKey)});
 assert.equal(m2.enable().ok,true);
 assert.equal(s.storage.getItem(s.backupKey),backup);
});
