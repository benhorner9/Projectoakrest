import test from 'node:test';
import assert from 'node:assert/strict';
import {cloneDropTables,DEFAULT_DROP_TABLES,rollDropTable,readDropTables,sanitizeDropTables,sanitizeDropTable,MAX_DROP_ROWS} from '../src/drop-tables.js';
import {createMonsterDrops,saveGroundDrops,collectDrop} from '../src/loot.js';
import {freshCharacterSave} from '../src/rules.js';
import {isDropEditorAllowed} from '../src/drop-editor.js';
test('defaults preserve all original loot weights and coin amounts',()=>{
 const expected={mossling:[100,65,8],boar:[100,70,13,7],bandit:[100,75,19,9]};
 for(const [monster,chances] of Object.entries(expected)){
  assert.deepEqual(DEFAULT_DROP_TABLES[monster].map(e=>e.chancePercent),chances);
  const drops=rollDropTable(monster,()=>0);
  assert.equal(drops.length,chances.length);
  assert.equal(drops[0].kind,'coins');
 }
});
test('independent 1 percent rolls have no 100th or 200th kill pity guarantee',()=>{
 const t=cloneDropTables();t.bandit=[{itemId:'weapon.melee.forged_sword',chancePercent:1}];
 let n=0;
 for(let i=0;i<200;i++)n+=rollDropTable('bandit',()=>.01,t).length;
 assert.equal(n,0);
 assert.equal(rollDropTable('bandit',()=>.0099,t).length,1);
});
test('zero, multiple and no drops possible with non-normalized probabilities',()=>{
 const t=cloneDropTables();
 t.boar=[{itemId:'material.boar-hide',chancePercent:40},{itemId:'armour.leather',chancePercent:90},{itemId:'weapon.ranged.bow',chancePercent:100}];
 assert.equal(rollDropTable('boar',()=>.99,t).length,1);
 assert.equal(rollDropTable('boar',()=>0,t).length,3);
 t.boar=[];assert.deepEqual(rollDropTable('boar',()=>0,t),[]);
 assert.equal(rollDropTable('unknown',()=>0,t).length,0);
});
test('editor validates item identity, limits, duplicate rows and chance precision',()=>{
 assert.deepEqual(sanitizeDropTable([{itemId:'currency.coins',chancePercent:0.01}]),[{itemId:'currency.coins',chancePercent:0.01}]);
 for(const bad of [
  [{itemId:'unknown',chancePercent:50}],
  [{itemId:'scroll.teleport',chancePercent:100}],
  [{itemId:'currency.coins',chancePercent:100.001}],
  [{itemId:'currency.coins',chancePercent:-1}],
  [{itemId:'currency.coins',chancePercent:101}],
  [{itemId:'currency.coins',chancePercent:10},{itemId:'currency.coins',chancePercent:20}],
 ]){
  assert.throws(()=>sanitizeDropTable(bad));
 }
 assert.throws(()=>sanitizeDropTable(Array.from({length:MAX_DROP_ROWS+1},()=>({itemId:'currency.coins',chancePercent:0}))));
 assert.throws(()=>sanitizeDropTables({invented:[]}));
});
test('saved overrides are browser-local and safely restored or rejected',()=>{
 const original=cloneDropTables();
 const custom=sanitizeDropTables({bandit:[{itemId:'armour.plate',chancePercent:2.5}]});
 assert.deepEqual(original.bandit,DEFAULT_DROP_TABLES.bandit);
 assert.equal(custom.bandit[0].chancePercent,2.5);
 const storage={getItem:()=>JSON.stringify(custom)};
 assert.deepEqual(readDropTables(storage,'test'),custom);
 assert.deepEqual(readDropTables({getItem:()=>'{unreadable'},'test'),original);
});
test('legacy ground drops retain their object shape and pickup behavior',()=>{
 const tables=cloneDropTables();tables.mossling=[{itemId:'armour.leather',chancePercent:100}];
 let i=0;const drops=createMonsterDrops('mossling',2,3,()=>0,()=>String(++i),tables);
 assert.equal(drops.length,1);assert.equal(drops[0].itemId,'leather');
 assert.deepEqual(saveGroundDrops(drops),drops);
 const player=freshCharacterSave();assert.equal(collectDrop(player,drops[0]),true);
 assert.deepEqual(player.inventory.armour,['leather']);
});
test('drop editor is accessible only on dev paths or localhost, never shared public path',()=>{
 assert.equal(isDropEditorAllowed('/oakrest-dev/','playcellbound.com'),true);
 assert.equal(isDropEditorAllowed('/oakrest-dev','playcellbound.com'),true);
 assert.equal(isDropEditorAllowed('/oakrest/','playcellbound.com'),false);
 assert.equal(isDropEditorAllowed('/','playcellbound.com'),false);
 assert.equal(isDropEditorAllowed('/','localhost'),true);
});
