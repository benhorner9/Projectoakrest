import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {defaultSave,validSave} from '../src/rules.js';
import {positionedEntries,reorderSlot,positionTransfer,inventoryKeyList,sanitizeSlotOrder} from '../src/item-slot-layout.js';
import {bankCoins,bankMaterials,bankEquipment,townBank} from '../src/town-services.js';
import {inventoryEntries} from '../src/equipment-ui.js';
import {bankGridEntries} from '../src/town-ui.js';
import {buildOakrestTown,OAKREST_BUILDINGS} from '../src/town-world.js';
import {terrainHeight,blocked,clearWorldObstacles} from '../src/terrain.js';
import {roadQuads} from '../src/town-layout.js';

test('Oakrest Bank is a monumental bank with an enterable secure banking hall',()=>{
 const b=OAKREST_BUILDINGS.find(b=>b.id==='bank');
 assert.ok(b.w>=14&&b.d>=12,'bank must have a grander footprint than standard shop');
 clearWorldObstacles();
 const scene=new THREE.Scene(),town=buildOakrestTown(scene);
 try{
  assert.ok(scene.getObjectByName('Bank monumental stone portico'));
  assert.ok(scene.getObjectByName('Oakrest iron vault door'));
  assert.ok(scene.getObjectByName('Oakrest vault combination lock'));
  assert.ok(scene.getObjectByName('Bank centre aisle carpet'));
  assert.equal(scene.children.some(o=>o.name==='Oakrest Bank Grand Hall'),true);
  let lockers=0,marble=0,tellers=0;
  scene.traverse(o=>{
   if(['Bank stored equipment chest','Bank sealed gold strongbox'].includes(o.name))lockers++;
   if(o.name==='Bank marble column')marble++;
   if(o.name==='Bank teller safety screen')tellers++;
  });
  assert.ok(lockers>=18,'bank must visibly store belongings');
  assert.equal(marble,4);
  assert.equal(tellers,3,'bank should have three distinct teller windows');
  assert.equal(blocked(-24,14,.30),false,'grand bank doorway must remain accessible');
  assert.equal(blocked(-24,18.5,.30),true,'grand bank front facade must block away from doorway');
  assert.equal(blocked(-29.6,14,.32),false,'banker-facing public floor remains walkable');
  town.update({x:-30,z:14});
  assert.equal(scene.getObjectByName('bank removable roof').visible,false,'bank roof hides inside');
  assert.ok(Number.isFinite(terrainHeight(-30,14)));
 }finally{clearWorldObstacles();}
});
test('inventory slots are rearrangeable without creating or losing equipment',()=>{
 const d=defaultSave();d.inventory.weapons.melee.push('daggers');
 d.inventory.materials['softwood-logs']=4;d.coins=30;
 const e=inventoryEntries(d),before=e.map(x=>x.canonical).sort();
 const slots=positionedEntries(e,d.inventorySlots);
 assert.ok(slots.length>=28);
 assert.ok(reorderSlot(d,'bag',e,0,9));
 assert.equal(positionedEntries(e,d.inventorySlots)[9]?.canonical,slots[0].canonical);
 assert.ok(reorderSlot(d,'bag',e,9,1),'swapping occupied slots works');
 assert.ok(!reorderSlot(d,'bag',e,15,16),'empty slots cannot create an item');
 assert.deepEqual(inventoryEntries(d).map(x=>x.canonical).sort(),before);
 const saved=validSave(JSON.parse(JSON.stringify(d)));
 assert.deepEqual(positionedEntries(inventoryEntries(saved),saved.inventorySlots).map(e=>e?.canonical||null),
  positionedEntries(e,d.inventorySlots).map(e=>e?.canonical||null));
});
test('bank dragging uses existing validated ownership transfers and keeps target slot arrangement',()=>{
 const d=defaultSave();d.inventory.weapons.melee.push('daggers');
 d.inventory.materials['softwood-logs']=5;d.coins=90;
 const carried=bankGridEntries(d,'bag'),stored=bankGridEntries(d,'vault');
 assert.ok(carried.some(e=>e.canonical==='currency.coins'));
 assert.equal(bankCoins(d,'deposit'),90);
 assert.ok(positionTransfer(d,'bag','vault','currency.coins',13,carried,stored));
 assert.equal(positionedEntries(bankGridEntries(d,'vault'),d.bankSlots,32)[13]?.canonical,'currency.coins');
 assert.equal(d.coins,0);assert.equal(d.bank.coins,90);
 let oldBag=bankGridEntries(d,'bag'),oldVault=bankGridEntries(d,'vault');
 assert.equal(bankMaterials(d,'softwood-logs','deposit'),5);
 positionTransfer(d,'bag','vault','material.softwood-logs',5,oldBag,oldVault);
 assert.equal(positionedEntries(bankGridEntries(d,'vault'),d.bankSlots,32)[5]?.canonical,'material.softwood-logs');
 oldBag=bankGridEntries(d,'bag');oldVault=bankGridEntries(d,'vault');
 assert.equal(bankEquipment(d,'weapon','daggers','deposit','melee'),true);
 positionTransfer(d,'bag','vault','weapon.melee.daggers',7,oldBag,oldVault);
 assert.equal(positionedEntries(bankGridEntries(d,'vault'),d.bankSlots,32)[7]?.canonical,'weapon.melee.daggers');
 assert.equal(bankEquipment(d,'weapon','sword','deposit','melee'),false,'actively worn weapons cannot be moved by dragging');
 const saved=validSave(JSON.parse(JSON.stringify(d)));
 assert.deepEqual(saved.bankSlots,d.bankSlots);
 assert.equal(saved.inventory.weapons.melee.includes('daggers'),false);
 assert.equal(saved.bank.weapons.melee.includes('daggers'),true);
 const beforeVault=bankGridEntries(saved,'vault'),beforeBag=bankGridEntries(saved,'bag');
 assert.equal(bankCoins(saved,'withdraw'),90);
 positionTransfer(saved,'vault','bag','currency.coins',18,beforeVault,beforeBag);
 assert.equal(positionedEntries(bankGridEntries(saved,'bag'),saved.inventorySlots)[18]?.canonical,'currency.coins');
 assert.equal(saved.coins,90);
});
test('corrupted item positions cannot inject unavailable items or duplicate slot contents',()=>{
 const d=defaultSave();d.inventorySlots=['weapon.melee.sword','weapon.melee.sword','weapon.magic.unknown',
  '<script>','currency.coins',null,'material.softwood-logs'];
 d.bankSlots=['weapon.melee.sword','currency.coins','slot.fake'];
 const clean=validSave(d);
 assert.equal(clean.inventorySlots[0],'weapon.melee.sword');
 assert.equal(clean.inventorySlots[1],null);
 assert.equal(clean.inventorySlots[2],null);
 assert.equal(clean.inventorySlots[3],null);
 assert.equal(clean.inventorySlots[4],null,'no coins owned');
 assert.deepEqual(clean.bankSlots,[null,null,null]);
 assert.deepEqual(sanitizeSlotOrder(['x','x'],['x','y']),['x',null]);
 assert.ok(inventoryKeyList(clean,'bag').includes('weapon.melee.sword'));
});


test('grand bank foundation is clear of actual full-width street paving',()=>{
 const building=OAKREST_BUILDINGS.find(b=>b.id==='bank');
 const bankMinX=building.x-building.d/2,bankMaxX=building.x+building.d/2;
 const bankMinZ=building.z-building.w/2,bankMaxZ=building.z+building.w/2;
 // Axis-aligned for an east-facing entrance.
 const item=[[bankMinX,bankMinZ],[bankMaxX,bankMinZ],[bankMaxX,bankMaxZ],[bankMinX,bankMaxZ]];
 const projections=(poly,axis)=>{
  const vals=poly.map(([x,z])=>x*axis[0]+z*axis[1]);
  return [Math.min(...vals),Math.max(...vals)];
 };
 for(const road of roadQuads()){
  const axes=[[1,0],[0,1]];
  for(let i=0;i<road.length;i++){
   const a=road[i],b=road[(i+1)%road.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
   axes.push([-dz/len,dx/len]);
  }
  const touches=axes.every(axis=>{
   const [a,b]=projections(road,axis),[c,d]=projections(item,axis);
   return a<d-.02&&c<b-.02;
  });
  assert.equal(touches,false,'cobbled thoroughfare cuts into the bank masonry');
 }
});
