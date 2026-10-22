import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_ART,CHARACTER_ART_KEYS,characterModelForAppearance,characterClipKind} from '../src/character-asset-catalog.js';
test('four distinct pinned free-tier sources and uncompromised combat cosmetics',()=>{
 assert.deepEqual(CHARACTER_ART_KEYS,['knight','rogue','mage','skeleton']);
 for(const item of Object.values(CHARACTER_ART)){
  assert.match(item.repo,/^KayKit-Game-Assets\/KayKit-Character-Pack-/);
  assert.match(item.commit,/^[0-9a-f]{40}$/);
  assert.match(item.blob,/^[0-9a-f]{40}$/);
  assert.ok(item.path.endsWith('/'+item.file));
  assert.ok(item.size>1e6&&item.size<6e6);
 }
 assert.equal(characterModelForAppearance({outfit:'tunic'}),'knight');
 assert.equal(characterModelForAppearance({outfit:'traveller'}),'rogue');
 assert.equal(characterModelForAppearance({outfit:'wanderer'}),'rogue');
 assert.equal(characterModelForAppearance({outfit:'scholar'}),'mage');
 assert.equal(characterModelForAppearance(null),'knight');
});
test('visible character animation selection does not depend on combat style',()=>{
 assert.equal(characterClipKind({}),'idle');
 assert.equal(characterClipKind({speed:2}),'walk');
 assert.equal(characterClipKind({speed:5}),'run');
 assert.equal(characterClipKind({speed:5,attack:{start:0}}),'attack');
 assert.equal(characterClipKind({hit:true,attack:{start:0}}),'hit');
 assert.equal(characterClipKind({dead:true,hit:true}),'death');
 assert.equal(characterClipKind({dodge:.7}),'dodge');
 assert.equal(characterClipKind({chopping:{start:2}}),'attack');
});
