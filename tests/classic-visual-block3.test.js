import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ITEM_CATALOG,getItem,itemIconUrl,itemIconSvg,itemIdFromLegacy} from '../src/items.js';
import {classicItemArtProfile} from '../src/classic-item-art.js';
import {makeWorldItemModel} from '../src/item-visuals.js';
import {freshCharacterSave,validSave} from '../src/rules.js';
import {classicItemAction} from '../src/classic-item-state.js';
import {MODEL_ITEMS,modelNameForItem} from '../src/item-model-registry.js';

test('Block 3 every canonical item has original ID and its own stable, local, cohesive 64px SVG',()=>{
 const distinct=new Set();
 for(const item of ITEM_CATALOG){
  assert.equal(getItem(item.id),item);
  assert.equal(itemIdFromLegacy(item.legacy),item.id);
  const svg=itemIconSvg(item.id);
  assert.ok(svg.startsWith('<svg '));
  assert.match(svg,/viewBox="0 0 64 64"/);
  assert.match(svg,/data-oakrest-id="/);
  assert.ok(svg.includes('data-oakrest-id="'+item.id+'"'));
  assert.ok(svg.includes('oakrest-back'));
  assert.ok(!svg.includes('<image'),item.id+' must not need downloads');
  assert.ok(!svg.includes('BASE')&&!svg.includes('SHADE')&&!svg.includes('SHINE'),'unexpanded art tokens: '+item.id);
  const url=itemIconUrl(item.id);
  assert.ok(url.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.equal(url,itemIconUrl(item.id),'icon source must not flicker or change identity on redraw');
  assert.equal(decodeURIComponent(url.split(',')[1]),svg);
  assert.equal(itemIconSvg(item.id),svg);
  distinct.add(svg);
 }
 assert.equal(distinct.size,ITEM_CATALOG.length);
 assert.equal(itemIconUrl('invalid'),null);
 assert.equal(itemIconSvg('invalid'),null);
 for(const [id,name] of Object.entries(MODEL_ITEMS))
  assert.equal(modelNameForItem(id),name,'legacy geometry registry remains intact');
});

test('Block 3 distinguishes every physical resource family and crafted product without rarity band coding',()=>{
 const mapping={
  'currency.coins':'coins','material.softwood-logs':'logs',
  'material.pine-logs':'logs','material.copper-ore':'ore','material.tin-ore':'ore',
  'material.bronze-bar':'ingot','material.reed':'herbs','material.moss-fibre':'herbs',
  'material.boar-hide':'hide','material.ration':'ration','material.woodland-tonic':'potion',
  'material.frost-scroll':'scroll','material.ember-scroll':'scroll','scroll.teleport':'scroll',
  'material.ward-seal':'seal','material.hollow-shard':'crystal',
  'material.warden-heart':'heart','material.field-arrows':'arrows',
  'slot.recruit-helm':'helm','slot.scout-boots':'boots','slot.recruit-shield':'shield',
  'weapon.melee.greatsword':'greatsword','weapon.melee.daggers':'daggers',
  'weapon.ranged.crossbow':'crossbow','weapon.magic.ember':'wand',
  'weapon.magic.frost':'staff'
 };
 for(const [id,shape] of Object.entries(mapping)){
  const item=getItem(id);assert.ok(item,id+' catalogue registration');
  assert.equal(classicItemArtProfile(item).shape,shape,id+' correct resource silhouette');
 }
 const logs=['softwood','pine','oak','willow','ironbark','moonwood','elderwood'].map(id=>itemIconSvg('material.'+id+'-logs'));
 assert.equal(new Set(logs).size,7,'each wood species has its own identifiable icon');
 const axes=['bronze','iron','steel','verdite','safferite','cobalt','pryrite'].map(id=>classicItemArtProfile(getItem('weapon.melee.'+id+'-axe')));
 assert.equal(new Set(axes.map(x=>x.base)).size,7);
 assert.ok(axes.every(x=>x.shape==='axe'),'all seven tools keep an axe silhouette');
});

test('Block 3 Classic ground loot meshes represent real item categories with bounded geometry and no async assets',()=>{
 for(const item of ITEM_CATALOG.filter(x=>x.dropAllowed)){
  const model=makeWorldItemModel(item.legacy,{classic:true});
  assert.ok(model instanceof THREE.Group,item.id);
  assert.equal(model.userData.itemId,item.id);
  assert.equal(model.userData.classicOnly,true);
  assert.equal(model.userData.visualShape,classicItemArtProfile(item).shape);
  let meshes=0,triangles=0;
  model.traverse(part=>{
   if(!part.isMesh)return;meshes++;
   const idx=part.geometry.index;
   triangles+=idx?idx.count/3:part.geometry.getAttribute('position').count/3;
   assert.ok(Number.isFinite(part.position.y),'finite local placement: '+item.id);
   assert.ok(part.position.y>=0&&part.position.y<2,'ground item must be visibly close to floor: '+item.id);
  });
  assert.ok(meshes>=2&&meshes<=18,item.id+' bounded low-poly draw count: '+meshes);
  assert.ok(triangles<1500,item.id+' excessive geometry: '+triangles);
  // All Classic pieces have no dynamic asset pop-in; QA cleans up per model.
  model.traverse(part=>{if(part.isMesh){part.geometry.dispose();part.material.dispose();}});
 }
 assert.equal(makeWorldItemModel({kind:'unknown',itemId:'bad'},{classic:true}),null);
});

test('Block 3 rendering an entire catalogue and real inventory action never rewrites save item identity',()=>{
 const state=freshCharacterSave();
 state.gear={melee:'none',magic:'none',ranged:'none'};
 state.inventory.materials['softwood-logs']=3;
 const old=JSON.stringify(state);
 ITEM_CATALOG.forEach(item=>{itemIconSvg(item.id);classicItemArtProfile(item);});
 assert.equal(JSON.stringify(state),old);
 const result=classicItemAction(state,{type:'reorder',scope:'bag',from:0,to:0});
 assert.ok(result&&typeof result.ok==='boolean');
 const copy=validSave(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(copy.inventory,state.inventory);
 assert.deepEqual(copy.gear,state.gear);
});
