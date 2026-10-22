import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as THREE from 'three';
import {ITEM_CATALOG,itemIconUrl,getItem} from '../src/items.js';
import {MODEL_NAMES,modelNameForItem} from '../src/item-model-registry.js';
import {createActor,equipActor,applyCharacterAppearance} from '../src/actors.js';
import {applyVisibleEquipment} from '../src/character-equipment-art.js';
import {makeWorldItemModel} from '../src/item-visuals.js';

test('CC0 accessory meshes have valid self-hosted glTF buffers and generated icon art',()=>{
 assert.equal(MODEL_NAMES.length,10);
 for(const name of MODEL_NAMES){
  const dir=new URL('../assets/kaykit-adventurers/',import.meta.url);
  const gltf=new URL(name+'.gltf',dir),icon=new URL('icons/'+name+'.svg',dir);
  assert.ok(existsSync(gltf),name+' model');
  assert.ok(existsSync(new URL(name+'.bin',dir)),name+' buffer');
  const asset=JSON.parse(readFileSync(gltf,'utf8'));
  assert.equal(asset.asset.version,'2.0');
  assert.ok(asset.meshes.length);
  assert.ok(asset.accessors.length);
  assert.ok(existsSync(new URL(asset.buffers[0].uri,dir)));
  for(const image of asset.images||[])assert.ok(existsSync(new URL(image.uri,dir)),name+' texture');
  const svg=readFileSync(icon,'utf8');
  assert.ok(svg.includes('<svg')&&svg.includes('<polygon'),name+' real-mesh icon');
 }
 assert.ok(existsSync(new URL('../assets/kaykit-adventurers/LICENSE.txt',import.meta.url)));
});
test('every registered item has an icon and asset mapping does not alter IDs',()=>{
 for(const item of ITEM_CATALOG)assert.ok(itemIconUrl(item.id),item.id);
 const source=getItem('weapon.melee.sword');
 assert.equal(source.legacy.itemId,'sword');
 assert.equal(modelNameForItem(source.id),'sword_1handed');
 assert.equal(modelNameForItem('weapon.melee.bronze-axe'),'axe_1handed');
 assert.equal(modelNameForItem('material.boar-hide'),null);
 assert.match(itemIconUrl(source.id),/\/assets\/kaykit-adventurers\/icons\/sword_1handed\.svg$/);
 assert.ok(itemIconUrl('material.boar-hide').startsWith('data:image/svg+xml'));
});
test('visible worn set follows bones, changes with style, and is removed on unequip',()=>{
 const actor=createActor();
 equipActor(actor,'melee','sword','starter-mail');
 applyCharacterAppearance(actor,{hairstyle:'long'});
 const extra={helm:'recruit-helm',legs:'recruit-greaves',boots:'recruit-boots',amulet:'recruit-amulet',ring:'recruit-ring'};
 applyVisibleEquipment(actor,'starter-mail',extra,'melee');
 assert.ok(actor.userData.visibleEquipmentNodes.length>=7);
 assert.equal(actor.userData.hair.visible,false);
 assert.equal(actor.userData.chestPlate.visible,true);
 assert.ok(actor.userData.visibleEquipmentNodes.every(g=>g.parent));
 const previous=actor.userData.visibleEquipmentNodes.slice();
 applyVisibleEquipment(actor,'starter-leather',{},'ranged');
 assert.ok(previous.every(g=>!g.parent),'old armour detaches on swap');
 assert.equal(actor.userData.hair.visible,true);
 assert.equal(actor.userData.chestPlate.visible,false);
 assert.equal(actor.userData.leather.visible,true);
 equipActor(actor,'magic','frost','starter-robes');
 applyVisibleEquipment(actor,'starter-robes',{helm:'apprentice-hood',legs:'apprentice-leggings',boots:'apprentice-boots'},'magic');
 assert.ok(actor.userData.visibleEquipmentNodes.length>=5);
});
test('world drops retain their procedural 3D fallback until models load',()=>{
 const drop={kind:'weapon',itemId:'daggers',style:'melee',amount:1};
 const model=makeWorldItemModel(drop);assert.ok(model instanceof THREE.Group);
 assert.ok(model.children.some(x=>x.isMesh));
 model.traverse(child=>{if(child.isMesh){child.geometry.dispose();child.material.dispose();}});
});
