import test from 'node:test';
import assert from 'node:assert/strict';
import {PACKS,QUATERNIUS_MODELS,VILLAGE_MODULE_FILES,townOutfit,monsterModel,playerOutfit} from '../src/quaternius-catalog.js';
test('all five explicitly selected Quaternius packs have an official CC0 source record',()=>{
 assert.deepEqual(Object.keys(PACKS),['base','outfits','monsters','medieval','rpg']);
 for(const info of Object.values(PACKS)){assert.equal(info.license,'CC0-1.0');assert.match(info.url,/^https:\/\/quaternius\.com\/packs\//);}
});
test('curated actual files are pinned to fixed repository commit and blob SHA',()=>{
 for(const item of [...QUATERNIUS_MODELS,...VILLAGE_MODULE_FILES]){
  assert.match(item.commit,/^[0-9a-f]{40}$/);
  assert.match(item.blob,/^[0-9a-f]{40}$/);
  assert.ok(item.size>500);
  assert.equal(item.file.endsWith('.glb')?item.file:item.path.split('/').at(-1),item.file);
 }
 const key=new Set(QUATERNIUS_MODELS.map(x=>x.id));
 assert.equal(key.size,QUATERNIUS_MODELS.length);
 assert.ok(key.has('base-male')&&key.has('base-female'));
 assert.ok(key.has('peasant-male')&&key.has('peasant-female'));
 assert.ok(key.has('mushnub')&&key.has('orc'));
});
test('no one in Oakrest town receives combat clothes or weapons',()=>{
 for(const role of ['Banker','Shopkeeper','Trade Steward','Village watch','Warden courier','Gardener','Farmer']){
  for(let i=0;i<20;i++)assert.match(townOutfit(role,i),/^peasant-(male|female)$/);
 }
 assert.equal(monsterModel('mossling'),'mushnub');
 assert.equal(monsterModel('boar'),null);
 assert.equal(monsterModel('bandit'),null);
 assert.equal(playerOutfit({sex:'female'}),'ranger-female');
});
