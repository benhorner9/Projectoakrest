import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {MODEL_NAMES,modelNameForItem} from '../src/item-model-registry.js';
import {getItem,itemIconUrl} from '../src/items.js';
import {createActor,equipActor} from '../src/actors.js';
import {applyVisibleEquipment} from '../src/character-equipment-art.js';

const base=new URL('../assets/kaykit-adventurers/',import.meta.url);
test('every mapped CC0 mesh has a local geometry buffer, PNG atlas, icon and provenance',()=>{
 const manifest=readFileSync(new URL('SOURCE.md',base),'utf8');
 const license=readFileSync(new URL('LICENSE.txt',base),'utf8');
 assert.match(manifest,/KayKit/i);assert.match(license,/Creative Commons|CC0|public domain/i);
 for(const name of MODEL_NAMES){
  const doc=JSON.parse(readFileSync(new URL(name+'.gltf',base),'utf8'));
  assert.equal(doc.asset.version,'2.0');
  assert.ok(doc.meshes.some(m=>m.primitives.length));
  for(const buffer of doc.buffers)assert.ok(existsSync(new URL(buffer.uri,base)),buffer.uri);
  for(const image of doc.images||[])assert.ok(existsSync(new URL(image.uri,base)),image.uri);
  assert.ok(existsSync(new URL('icons/'+name+'.svg',base)),name+' icon');
 }
});
test('legacy CC0 mappings remain valid while all Classic icons use a consistent deterministic local art set',()=>{
 for(const id of ['weapon.melee.sword','weapon.melee.daggers','weapon.melee.greatsword','weapon.magic.frost','weapon.magic.ember','weapon.ranged.crossbow','slot.recruit-shield','slot.bronze-arrows']){
  assert.ok(getItem(id),id);assert.ok(modelNameForItem(id),id);
  assert.ok(itemIconUrl(id).startsWith('data:image/svg+xml'),id);
 }
 assert.equal(modelNameForItem('weapon.ranged.bow'),null);
 assert.equal(modelNameForItem('weapon.melee.bronze-axe'),'axe_1handed');
 assert.ok(itemIconUrl('armour.traveller').startsWith('data:image/svg+xml'));
 assert.equal(modelNameForItem('invalid'),null);
});
test('visible starter equipment follows animated joints and can switch sets without accumulating meshes',()=>{
 const actor=createActor();equipActor(actor,'melee','sword','starter-mail');
 applyVisibleEquipment(actor,'starter-mail',{helm:'recruit-helm',legs:'recruit-greaves',boots:'recruit-boots',amulet:'recruit-amulet',ring:'recruit-ring'},'melee');
 assert.equal(actor.userData.hair.visible,false);
 assert.equal(actor.userData.chestPlate.visible,true);
 assert.ok(actor.userData.visibleEquipmentNodes.length>=5);
 const previous=actor.userData.visibleEquipmentNodes.slice();
 equipActor(actor,'magic','frost','starter-robes');
 applyVisibleEquipment(actor,'starter-robes',{legs:'apprentice-leggings'},'magic');
 assert.ok(previous.every(node=>!node.parent));
 assert.equal(actor.userData.hair.visible,true);
 assert.ok(actor.userData.visibleEquipmentNodes.length<=5);
 assert.ok(actor.userData.visibleEquipmentNodes.some(node=>node.parent===actor.userData.rig));
});
