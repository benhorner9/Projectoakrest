import {ADVENTURE_MATERIAL_IDS} from '../src/adventure-content.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LOADOUTS,ARMOUR,STYLE_ORDER,freshCharacterSave,validSave} from '../src/rules.js';
import {MATERIAL_DROPS} from '../src/combat-feel.js';
import {SLOT_ITEMS} from '../src/equipment-slots.js';
import {ITEM_CATALOG,ITEMS_BY_ID,itemIconSvg,itemIconUrl,itemFromDrop,itemIdFromLegacy,DROPPABLE_ITEMS} from '../src/items.js';
import {makeWorldItemModel} from '../src/item-visuals.js';
import {createActor,equipActor,applyEquipmentVariant} from '../src/actors.js';
test('every existing gear and resource has a stable canonical item ID',()=>{
 const expected=1+Object.keys(MATERIAL_DROPS).length+Object.keys(ARMOUR).length+
  STYLE_ORDER.reduce((count,style)=>count+Object.keys(LOADOUTS[style]).length,0)+Object.keys(SLOT_ITEMS).length+7+1+ADVENTURE_MATERIAL_IDS.length; // seven Woodcutting logs
 assert.equal(ITEM_CATALOG.length,expected);
 const ids=new Set(ITEM_CATALOG.map(item=>item.id));
 assert.equal(ids.size,expected);
 assert.equal(ITEMS_BY_ID['scroll.teleport'].dropAllowed,false);
 for(const item of ITEM_CATALOG){
  assert.ok(item.title&&item.accent&&item.shape);
  assert.ok(itemIconSvg(item.id).startsWith('<svg '));
  assert.ok(itemIconUrl(item.id).startsWith('data:image/svg+xml')||itemIconUrl(item.id).includes('/assets/kaykit-adventurers/icons/'));
  assert.equal(itemIdFromLegacy(item.legacy),item.id);
  assert.equal(itemFromDrop(item.legacy),item);
 }
});
test('every item has its own icon art, including a separate scroll icon',()=>{
 const icons=ITEM_CATALOG.map(item=>itemIconSvg(item.id));
 assert.equal(new Set(icons).size,icons.length);
 assert.equal(itemIconSvg('unknown'),null);
 assert.equal(DROPPABLE_ITEMS.some(item=>item.id==='scroll.teleport'),false);
});
test('every droppable item has a distinct tangible 3D model with visible geometry',()=>{
 for(const item of DROPPABLE_ITEMS){
  const model=makeWorldItemModel(item.legacy);
  assert.ok(model instanceof THREE.Group,item.id);
  let meshes=0;model.traverse(o=>{if(o.isMesh)meshes++;});
  assert.ok(meshes>=2,item.id);
  model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
 }
});
test('existing owned gear and ground loot survive catalogue introduction',()=>{
 const data=freshCharacterSave();
 data.inventory.weapons.melee=['daggers'];
 data.inventory.armour=['leather'];
 data.inventory.materials['boar-hide']=4;
 data.groundLoot=[{id:'drop-1',x:3,z:4,kind:'weapon',itemId:'daggers',style:'melee',amount:1}];
 const next=validSave(JSON.parse(JSON.stringify(data)));
 assert.deepEqual(next.inventory,data.inventory);
 assert.deepEqual(next.groundLoot,data.groundLoot);
});

test('worn gear variants have item-specific runes and isolated materials',()=>{
 const first=createActor(),second=createActor();
 equipActor(first,'melee','sword','traveller');
 equipActor(second,'melee','sword','traveller');
 applyEquipmentVariant(first,'melee','sword');
 applyEquipmentVariant(second,'melee','forged_sword');
 const one=first.userData.weapon.children.at(-1),two=second.userData.weapon.children.at(-1);
 assert.ok(one.isMesh&&two.isMesh);
 assert.notEqual(one.material.color.getHex(),two.material.color.getHex());
 assert.notEqual(first.userData.weapon.children.length,0);
 assert.ok(first.userData.ownedMaterials.length>0);
 const old=first.userData.ownedMaterials.slice();
 equipActor(first,'magic','frost','traveller');
 assert.equal(first.userData.ownedMaterials.length,0);
 assert.ok(old.every(m=>m instanceof THREE.Material));
});
