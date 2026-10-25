import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicProfile,chooseClassicProfile,classicRoster} from '../src/classic-character-data.js';
import {storageKey} from '../src/storage-key.js';
import {validSave} from '../src/rules.js';

const path='/oakrest-dev/classic.html';
const id1='b721c443-745d-4b27-9a72-37ea24720001';
const id2='b721c443-745d-4b27-9a72-37ea24720002';
class Store{
 constructor(){this.map=new Map();}
 getItem(k){return this.map.has(k)?this.map.get(k):null;}
 setItem(k,v){this.map.set(k,String(v));}
 removeItem(k){this.map.delete(k);}
}
test('classic creation writes a fully empty new world character in the original roster namespace',()=>{
 const store=new Store();store.setItem('oakrest-v1','leave the public save untouched');
 const profile=createClassicProfile(store,path,{
  name:'Oak Ranger',sex:'female',hairstyle:'ponytail',
  skinTone:'#aa7153',hairColor:'#765037',outfit:'scholar',outfitColor:'#4d745a'
 },id1);
 assert.equal(profile.name,'Oak Ranger');
 assert.equal(profile.outfitColor,'#4d745a');
 assert.equal(classicRoster(store,path).length,1);
 assert.equal(store.getItem(storageKey('oakrest-active-character',path)),id1);
 const raw=store.getItem(storageKey('oakrest-character-save-'+id1,path));
 const saved=validSave(JSON.parse(raw));
 assert.equal(saved.onboarding.area,'world');
 for(const style of ['melee','magic','ranged']){
  assert.equal(saved.gear[style],'none');
  assert.equal(saved.armour[style],'none');
  assert.deepEqual(saved.inventory.weapons[style],[]);
  assert.ok(Object.values(saved.equipment[style]).every(v=>v===null));
 }
 assert.equal(saved.xp.melee,0);assert.equal(saved.coins,0);
 assert.equal(store.getItem('oakrest-v1'),'leave the public save untouched');
 assert.equal(store.getItem('oakrest-characters-v1'),null);
});
test('existing character progress remains byte-identical when selecting or creating another',()=>{
 const store=new Store();
 createClassicProfile(store,path,{name:'Oak Ranger'},id1);
 const saveKey=storageKey('oakrest-character-save-'+id1,path);
 const original=store.getItem(saveKey);
 const next=createClassicProfile(store,path,{name:'Oak Mage'},id2);
 assert.equal(next.name,'Oak Mage');
 assert.equal(store.getItem(saveKey),original);
 chooseClassicProfile(store,path,id1);
 assert.equal(store.getItem(storageKey('oakrest-active-character',path)),id1);
 assert.equal(store.getItem(saveKey),original);
 assert.throws(()=>createClassicProfile(store,path,{name:'Oak Mage'},'b721c443-745d-4b27-9a72-37ea24720003'),/already have a character/);
 assert.equal(store.getItem(saveKey),original);
});
test('missing/corrupt saves cannot be selected, and a collision never overwrites bytes',()=>{
 const store=new Store();
 createClassicProfile(store,path,{name:'Oak Ranger'},id1);
 const activeKey=storageKey('oakrest-active-character',path);
 const key=storageKey('oakrest-character-save-'+id1,path);
 store.setItem(key,'{bad json}');
 assert.throws(()=>chooseClassicProfile(store,path,id1),/unreadable/);
 assert.equal(store.getItem(activeKey),id1);
 const poisoned=store.getItem(key);
 assert.throws(()=>createClassicProfile(store,path,{name:'Second Ranger'},id1),/already has saved progress/);
 assert.equal(store.getItem(key),poisoned);
});
