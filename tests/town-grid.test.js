import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,validSave} from '../src/rules.js';
import {bankGridEntries,shopGridEntries} from '../src/town-ui.js';
import {bankCoins,bankMaterials,bankEquipment,townBank} from '../src/town-services.js';

test('bank and bag grids show the actual item registry, not a duplicate inventory',()=>{
 const data=defaultSave();data.coins=60;
 data.inventory.materials['softwood-logs']=12;
 data.bank.materials['boar-hide']=7;
 const bag=bankGridEntries(data,'bag'),vault=bankGridEntries(data,'vault');
 assert.equal(bag.find(e=>e.canonical==='currency.coins')?.qty,60);
 assert.equal(bag.find(e=>e.canonical==='material.softwood-logs')?.qty,12);
 assert.equal(vault.find(e=>e.canonical==='material.boar-hide')?.qty,7);
 assert.ok(bag.every(e=>e.qty>0&&e.title));
 assert.ok(!vault.some(e=>e.canonical==='currency.coins'));
});
test('bank quantity choices transfer exact amounts and preserve saves',()=>{
 const data=defaultSave();data.coins=72;data.inventory.materials['softwood-logs']=17;
 assert.equal(bankCoins(data,'deposit',1),1);
 assert.equal(bankCoins(data,'deposit',5),5);
 assert.equal(bankCoins(data,'deposit',10),10);
 assert.equal(data.coins,56);assert.equal(townBank(data).coins,16);
 assert.equal(bankCoins(data,'withdraw',5),5);
 assert.equal(bankCoins(data,'withdraw',Infinity),11);
 assert.equal(data.coins,72);
 assert.equal(bankMaterials(data,'softwood-logs','deposit',5),5);
 assert.equal(bankMaterials(data,'softwood-logs','deposit',10),10);
 assert.equal(bankMaterials(data,'softwood-logs','deposit',Infinity),2);
 assert.equal(data.inventory.materials['softwood-logs']||0,0);
 assert.equal(bankMaterials(data,'softwood-logs','withdraw',1),1);
 assert.equal(bankMaterials(data,'softwood-logs','withdraw',Infinity),16);
 assert.equal(data.inventory.materials['softwood-logs'],17);
 assert.equal(bankCoins(data,'deposit',-2),0);
 assert.equal(bankCoins(data,'deposit',NaN),0);
 assert.equal(bankMaterials(data,'softwood-logs','deposit',NaN),0);
 assert.equal(validSave(JSON.parse(JSON.stringify(data))).coins,data.coins);
});
test('icon shop grid reflects missing pieces, owned items and banked inventory',()=>{
 const data=defaultSave(),entries=shopGridEntries(data);
 assert.equal(entries.length,7);
 assert.ok(entries.every(e=>e.icon&&e.cost>=0&&e.label));
 assert.ok(entries.some(e=>e.kind==='bundle'));
 data.inventory.weapons.melee.push('daggers');
 data.bank.weapons.melee.push('sword');
 const updated=shopGridEntries(data);
 assert.equal(updated.find(e=>e.id==='starter-sword').banked,true);
 assert.ok(updated.find(e=>e.kind==='bundle'&&e.style==='melee').cost>=0);
});
test('equipment grid banking never takes items worn in a combat preset',()=>{
 const d=defaultSave();
 assert.equal(bankEquipment(d,'weapon','sword','deposit','melee'),false);
 d.inventory.weapons.melee.push('daggers');
 assert.equal(bankEquipment(d,'weapon','daggers','deposit','melee'),true);
 assert.ok(bankGridEntries(d,'vault').some(e=>e.canonical==='weapon.melee.daggers'));
 assert.ok(!bankGridEntries(d,'bag').some(e=>e.canonical==='weapon.melee.daggers'));
});
